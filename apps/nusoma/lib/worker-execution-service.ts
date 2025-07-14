import { db } from '@nusoma/database'
import { environment, Priority, TaskStatus, userStats } from '@nusoma/database/schema'
import { eq, sql } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { createLogger } from '@/lib/logger/console-logger'
import { persistExecutionError, persistExecutionLogs } from '@/lib/logger/execution-logger'
import { buildTraceSpans } from '@/lib/logger/trace-spans'
import { checkServerSideUsageLimits } from '@/lib/usage-monitor'
import { decryptSecret } from '@/lib/utils'
import { loadWorkerFromNormalizedTables } from '@/lib/workers/db-helpers'
import { updateWorkerRunCounts } from '@/lib/workers/utils'
import {
  captureBlockOutputsAsTaskEvents,
  createTaskAndCaptureEvent,
  updateTaskAndCaptureEvent,
} from '@/app/api/tasks/_task-event-capture'
import { Executor } from '@/executor'
import { Serializer } from '@/serializer'
import type { BlockState, WorkerState } from '@/stores/workers/worker/types'

const logger = createLogger('WorkerExecutionService')

// Define the schema for environment variables
const EnvVarsSchema = z.record(z.string())

// Keep track of running executions to prevent overlap
const runningExecutions = new Set<string>()

// Custom error class for usage limit exceeded
export class UsageLimitError extends Error {
  statusCode: number

  constructor(message: string) {
    super(message)
    this.name = 'UsageLimitError'
    this.statusCode = 402 // Payment Required status code
  }
}

export async function executeWorker(
  worker: any,
  requestId: string,
  input?: any,
  taskId?: string,
  workspaceId?: string
) {
  const workerId = worker.id
  const executionId = uuidv4()

  // Skip if this worker is already running
  if (runningExecutions.has(workerId)) {
    logger.warn(`[${requestId}] Worker is already running: ${workerId}`)
    throw new Error('Worker is already running')
  }

  // Check if the user has exceeded their usage limits
  const usageCheck = await checkServerSideUsageLimits(worker.userId)
  if (usageCheck.isExceeded) {
    logger.warn(`[${requestId}] User ${worker.userId} has exceeded usage limits`, {
      currentUsage: usageCheck.currentUsage,
      limit: usageCheck.limit,
    })
    throw new UsageLimitError(
      usageCheck.message || 'Usage limit exceeded. Please upgrade your plan to continue.'
    )
  }

  let actualTaskId = taskId

  // If no taskId provided, create a new task automatically
  if (!actualTaskId && workspaceId) {
    logger.info(
      `[${requestId}] No task ID provided, creating task automatically for worker: ${workerId}`
    )

    const autoTask = await createTaskAndCaptureEvent(
      {
        workspaceId,
        title: `Auto-generated task for ${worker.name || 'Unnamed Worker'}`,
        description: `This task was automatically created for worker execution.`,
        status: TaskStatus.IN_PROGRESS,
        assigneeId: workerId,
        projectId: null,
        priority: Priority.LOW,
        tags: [],
        scheduleDate: null,
        rawResult: {},
        resultReport: '',
        approvedBy: null,
        rejectedBy: null,
      },
      worker.userId
    )

    actualTaskId = autoTask.id

    // Add the "generated" tag
    await updateTaskAndCaptureEvent(autoTask.id, { tags: [{ text: 'generated' }] }, worker.userId)

    logger.info(`[${requestId}] Created task: ${actualTaskId} for worker execution`)
  }

  // Log input to help debug
  logger.info(
    `[${requestId}] Executing worker with input:`,
    input ? JSON.stringify(input, null, 2) : 'No input provided'
  )

  // Ensure input is properly structured for the starter block
  let processedInput = input
  if (input && typeof input === 'object' && Object.keys(input).length > 0) {
    // Convert object input to string format for better agent handling
    const taskPromptTemplate = `
    You are a helpful assistant.
    You are given a task with a user input.
    You need to complete the task based on the user input. The user input is:
    {{input}}
    `
    processedInput = taskPromptTemplate.replace('{{input}}', JSON.stringify(input))

    logger.info(
      `[${requestId}] Structured input for worker:`,
      JSON.stringify(processedInput, null, 2)
    )
  }

  try {
    runningExecutions.add(workerId)
    logger.info(`[${requestId}] Starting worker execution: ${workerId}`)

    // Use the deployed state if available, otherwise fall back to current state or load from normalized tables
    let workerState = worker.deployedState || worker.state

    if (worker.deployedState) {
      logger.info(`[${requestId}] Using deployed state for worker execution: ${workerId}`)
    } else if (worker.state) {
      logger.warn(
        `[${requestId}] No deployed state found for worker: ${workerId}, using current state`
      )
    } else {
      // Both deployedState and state are undefined, try to load from normalized tables
      logger.info(
        `[${requestId}] No state found in worker record, loading from normalized tables: ${workerId}`
      )

      try {
        const normalizedData = await loadWorkerFromNormalizedTables(workerId)
        if (normalizedData) {
          workerState = {
            blocks: normalizedData.blocks,
            edges: normalizedData.edges,
            loops: normalizedData.loops,
            parallels: normalizedData.parallels,
          }
          logger.info(
            `[${requestId}] Successfully loaded worker state from normalized tables: ${workerId}`
          )
        } else {
          throw new Error(`No worker data found in normalized tables for worker: ${workerId}`)
        }
      } catch (error: any) {
        logger.error(
          `[${requestId}] Failed to load worker from normalized tables: ${workerId}`,
          error
        )
        throw new Error(
          `Worker state not found and failed to load from normalized tables: ${error.message}`
        )
      }
    }

    const state = workerState as WorkerState
    const { blocks, edges, loops, parallels } = state

    if (!blocks) {
      logger.error(`[${requestId}] Critical: blocks are undefined in worker state for ${workerId}`)
      throw new Error('Worker blocks are missing in state.')
    }

    // Fetch the user's environment variables (if any)
    const [userEnv] = await db
      .select()
      .from(environment)
      .where(eq(environment.userId, worker.userId))
      .limit(1)

    if (!userEnv) {
      logger.debug(
        `[${requestId}] No environment record found for user ${worker.userId}. Proceeding with empty variables.`
      )
    }

    // Parse and validate environment variables.
    const dbVariables = EnvVarsSchema.parse(userEnv?.variables ?? {})

    // This will hold the state of blocks with environment variables substituted.
    const blocksWithEnvVarsSubstituted: Record<string, BlockState['subBlocks']> = {}

    for (const [blockId, blockDefinition] of Object.entries(blocks)) {
      if (!blockDefinition || !blockDefinition.subBlocks) {
        blocksWithEnvVarsSubstituted[blockId] = {} // or blockDefinition.subBlocks if it can be empty but defined
        continue
      }

      const processedSubBlocks: BlockState['subBlocks'] = {}
      for (const [subBlockKey, subBlockDefinition] of Object.entries(blockDefinition.subBlocks)) {
        let value = subBlockDefinition.value
        if (typeof value === 'string' && value.includes('{{') && value.includes('}}')) {
          const matches = value.match(/{{([^}]+)}}/g)
          if (matches) {
            for (const match of matches) {
              const varName = match.slice(2, -2)
              const encryptedValue = dbVariables[varName]
              if (!encryptedValue) {
                throw new Error(
                  `Environment variable "${varName}" was not found for worker ${workerId}`
                )
              }
              try {
                const { decrypted } = await decryptSecret(encryptedValue)
                value = (value as string).replace(match, decrypted)
              } catch (error: any) {
                logger.error(
                  `[${requestId}] Error decrypting env var "${varName}" for worker ${workerId}`,
                  error
                )
                throw new Error(`Failed to decrypt env var "${varName}": ${error.message}`)
              }
            }
          }
        }
        processedSubBlocks[subBlockKey] = {
          ...subBlockDefinition,
          value: value,
        }
      }
      blocksWithEnvVarsSubstituted[blockId] = processedSubBlocks
    }

    // Create a map of decrypted environment variables
    const decryptedEnvVars: Record<string, string> = {}
    for (const [key, encryptedValue] of Object.entries(dbVariables)) {
      try {
        const { decrypted } = await decryptSecret(encryptedValue)
        decryptedEnvVars[key] = decrypted
      } catch (error: any) {
        logger.error(
          `[${requestId}] Failed to decrypt environment variable "${key}" for general use.`,
          error
        )
        throw new Error(`Failed to decrypt environment variable "${key}": ${error.message}`)
      }
    }

    // Process the block states to match BlockOutput format expected by Executor
    const processedBlockStatesForExecutor: Record<string, any> = {}
    for (const [blockId, subBlocks] of Object.entries(blocksWithEnvVarsSubstituted)) {
      const blockOutput: Record<string, any> = {}
      for (const [subBlockId, subBlockData] of Object.entries(subBlocks)) {
        // Ensure subBlockData is not undefined and has a value property
        if (subBlockData && subBlockData.value !== undefined) {
          blockOutput[subBlockId] = subBlockData.value
        } else {
          // Handle cases where subBlockData or subBlockData.value might be undefined if necessary
          // For instance, setting a default null or skipping
          blockOutput[subBlockId] = null
        }
      }
      // Wrap in response format expected by Executor
      processedBlockStatesForExecutor[blockId] = { response: blockOutput }
    }

    // Get worker variables
    let workerVariables = {}
    if (worker.variables) {
      try {
        // Parse worker variables if they're stored as a string
        if (typeof worker.variables === 'string') {
          workerVariables = JSON.parse(worker.variables)
        } else {
          // Otherwise use as is (already parsed JSON)
          workerVariables = worker.variables
        }
        logger.debug(
          `[${requestId}] Loaded ${Object.keys(workerVariables).length} worker variables for: ${workerId}`
        )
      } catch (error) {
        logger.error(`[${requestId}] Failed to parse worker variables: ${workerId}`, error)
        // Continue execution even if variables can't be parsed
      }
    } else {
      logger.debug(`[${requestId}] No worker variables found for: ${workerId}`)
    }

    // Serialize and execute the worker
    logger.debug(`[${requestId}] Serializing worker: ${workerId}`)
    logger.info(
      `[${requestId}] Data for Serializer - Block IDs: ${JSON.stringify(Object.keys(blocks))}`
    )
    logger.info(`[${requestId}] Data for Serializer - Loops: ${JSON.stringify(loops, null, 2)}`)

    const serializedWorker = new Serializer().serializeWorker(blocks, edges, loops, parallels)

    // Use new constructor format to match use-worker-execution.ts
    const executor = new Executor({
      worker: serializedWorker,
      currentBlockStates: processedBlockStatesForExecutor,
      envVarValues: decryptedEnvVars,
      workerInput: processedInput,
      workerVariables: workerVariables,
    })

    const result = await executor.execute(workerId)

    // Check if we got a StreamingExecution result (with stream + execution properties)
    // For API routes, we only care about the ExecutionResult part, not the stream
    const executionResult = 'stream' in result && 'execution' in result ? result.execution : result

    logger.info(`[${requestId}] Worker execution completed: ${workerId}`, {
      success: executionResult.success,
      executionTime: executionResult.metadata?.duration,
      taskId: actualTaskId,
    })

    // Capture block outputs as task events if we have a task
    if (actualTaskId && executionResult.logs) {
      try {
        await captureBlockOutputsAsTaskEvents(
          actualTaskId,
          executionId,
          executionResult.logs,
          worker.userId
        )
        logger.info(
          `[${requestId}] Captured ${executionResult.logs.length} block outputs as task events`
        )
      } catch (error) {
        logger.error(`[${requestId}] Failed to capture block outputs as task events:`, error)
      }
    }

    // Corrected logging and stats update logic
    if (executionResult.success) {
      await updateWorkerRunCounts(workerId)

      // buildTraceSpans expects the full executionResult
      const { traceSpans, totalDuration } = buildTraceSpans(executionResult)
      const enrichedResult = {
        ...executionResult,
        traceSpans,
        totalDuration,
      }
      // Corrected: persistExecutionLogs(workerId, executionId, enrichedResult, trigger)
      await persistExecutionLogs(workerId, executionId, enrichedResult, 'api')
    } else {
      // Persist error (Corrected: pass Error object, 4 arguments)
      await persistExecutionError(
        workerId,
        executionId,
        new Error(executionResult.error || 'Unknown execution error'), // Create Error object
        'api'
      )
    }
    await db
      .update(userStats)
      .set({
        totalApiCalls: sql`${userStats.totalApiCalls} + 1`,
        lastActive: new Date(),
      })
      .where(eq(userStats.userId, worker.userId))

    return {
      ...executionResult,
      taskId: actualTaskId,
      executionId,
    }
  } catch (error: any) {
    logger.error(`[${requestId}] Error in worker execution for ${workerId}:`, error)
    // Persist error (Corrected: pass Error object if 'error' is an Error, otherwise create one, 4 arguments)
    const errorToPersist =
      error instanceof Error
        ? error
        : new Error(error.message || 'Worker execution service caught an unknown error')
    await persistExecutionError(workerId, executionId, errorToPersist, 'api')
    throw error
  } finally {
    runningExecutions.delete(workerId)
    logger.info(`[${requestId}] Finished worker execution (or attempt): ${workerId}`)
  }
}
