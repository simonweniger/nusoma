import { google } from '@ai-sdk/google'
import { db } from '@nusoma/database'
import {
  ActionType,
  ActorType,
  chat,
  TaskStatus,
  taskActivity as taskActivityTable,
  task as taskTable,
  worker,
} from '@nusoma/database/schema'
import { generateText } from 'ai'
import { eq, sql } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createLogger } from '@/lib/logger/console-logger'
import { generateUUID } from '@/lib/utils'
import { executeWorker } from '@/lib/worker-execution-service'
import { createErrorResponse, createSuccessResponse } from '../../workers/utils'

export const dynamic = 'force-dynamic'

const logger = createLogger('TaskProcessingAPI')

const pgmqMessageSchema = z.object({
  msg_id: z.string(),
  message: z.object({
    taskId: z.string(),
    userId: z.string(),
  }),
})

type PgmqMessage = z.infer<typeof pgmqMessageSchema>

/**
 * Generates a task report using LLM based on block outputs
 * @param task - The task object
 * @param blockOutputs - Array of block execution outputs
 * @returns Generated task report as markdown with cost information
 */
async function generateTaskReport(
  task: { title: string; description: string | null },
  blockOutputs: any[]
): Promise<{ report: string; cost?: any; tokens?: any }> {
  try {
    const blockOutputsText = blockOutputs
      .map((output, index) => {
        return `### Block ${index + 1} Output:\n${JSON.stringify(output, null, 2)}`
      })
      .join('\n\n')

    const prompt = `You are an AI assistant that creates comprehensive task reports based on execution results.

**Task Details:**
- Title: ${task.title}
- Description: ${task.description || 'No description provided'}

**Block Execution Outputs:**
${blockOutputsText}

Please create a well-structured task report that includes:

1. **TLDR**: A concise 2-3 sentence summary of what was accomplished
2. **Task Analysis**: Brief analysis of the task requirements
3. **Execution Summary**: Summary of what was executed and the key outputs
4. **Results**: Detailed breakdown of the results based on the block outputs
5. **Conclusion**: Final assessment and any recommendations

Format the report using clear markdown structure with appropriate headings and bullet points for readability.`

    const result = await generateText({
      model: google('gemini-2.5-pro'),
      prompt,
      temperature: 0.3,
      maxTokens: 4000, // Increased for Gemini's larger context window
    })

    logger.info('Task report generated successfully', {
      tokensUsed: result.usage?.totalTokens || 0,
      promptTokens: result.usage?.promptTokens || 0,
      completionTokens: result.usage?.completionTokens || 0,
      cost: result.providerMetadata?.cost || 'unknown',
    })

    return {
      report: result.text,
      cost: result.providerMetadata?.cost,
      tokens: {
        prompt: result.usage?.promptTokens || 0,
        completion: result.usage?.completionTokens || 0,
        total: result.usage?.totalTokens || 0,
      },
    }
  } catch (error) {
    logger.error('Error generating task report:', error)
    return {
      report: `# Task Report: ${task.title}

    ## TLDR
    Task execution completed but report generation failed.
    `,
      cost: undefined,
      tokens: { prompt: 0, completion: 0, total: 0 },
    }
  }
}

export async function GET(_request: NextRequest) {
  const BATCH_SIZE = 10
  const VISIBILITY_TIMEOUT = 60 // 60 seconds

  logger.info('Checking for tasks in queue...')

  try {
    const result = await db.execute(
      sql`SELECT msg_id, message FROM pgmq.read('task_queue', ${VISIBILITY_TIMEOUT}, ${BATCH_SIZE})`
    )

    const messages = result as unknown as PgmqMessage[]

    if (!messages || messages.length === 0) {
      logger.info('No tasks to process.')
      return createSuccessResponse({ message: 'No tasks to process.' })
    }

    logger.info(`Processing ${messages.length} tasks.`)
    const processingPromises = messages.map(async (msg) => {
      const requestId = crypto.randomUUID().slice(0, 8)
      try {
        const { taskId, userId } = pgmqMessageSchema.parse(msg).message

        const [task] = await db.select().from(taskTable).where(eq(taskTable.id, taskId)).limit(1)

        if (!task) {
          logger.error(`[${requestId}] Task not found: ${taskId}, for msg_id: ${msg.msg_id}`)
          await db.execute(sql`SELECT pgmq.delete('task_queue', ${BigInt(msg.msg_id)})`)
          return
        }

        if (!task.assigneeId) {
          logger.error(
            `[${requestId}] Task ${taskId} has no assignee (worker), for msg_id: ${msg.msg_id}`
          )
          await db.execute(sql`SELECT pgmq.delete('task_queue', ${BigInt(msg.msg_id)})`)
          return
        }

        const workerId = task.assigneeId

        // Get the worker object from the database
        const [workerData] = await db.select().from(worker).where(eq(worker.id, workerId)).limit(1)

        if (!workerData) {
          logger.error(`[${requestId}] Worker not found: ${workerId}, for msg_id: ${msg.msg_id}`)
          await db.execute(sql`SELECT pgmq.delete('task_queue', ${BigInt(msg.msg_id)})`)
          return
        }

        logger.info(`[${requestId}] Executing worker ${workerId} for task ${taskId}`)

        await db
          .update(taskTable)
          .set({ status: TaskStatus.IN_PROGRESS })
          .where(eq(taskTable.id, taskId))

        await db.insert(taskActivityTable).values({
          taskId: taskId,
          actionType: ActionType.TASK_EXECUTED,
          actorId: workerId,
          actorType: ActorType.SYSTEM,
          occurredAt: new Date(),
        })

        // Create a new chat
        const chatId = generateUUID()
        await db.insert(chat).values({
          id: chatId,
          title: task.title,
          userId: userId,
          workerId: workerId, // Use workerId as workerId since chat expects a worker reference
        })

        try {
          // Prepare input for the worker with task information
          const workerInput = {
            task: {
              id: taskId,
              title: task.title,
              description: task.description ?? '',
            },
          }

          const executionResult = await executeWorker(workerData, requestId, workerInput, taskId)

          logger.info(`[${requestId}] Worker execution successful.`)

          // Extract block outputs from execution result - use logs for block outputs and costs
          const blockOutputs = executionResult?.logs?.map((log) => log.output).filter(Boolean) || []

          logger.info(
            `[${requestId}] Generating task report from ${blockOutputs.length} block outputs`
          )

          // Generate task report using LLM with cost tracking
          const {
            report: taskReport,
            cost: reportCost,
            tokens: reportTokens,
          } = await generateTaskReport(
            { title: task.title, description: task.description },
            blockOutputs
          )

          logger.info(`[${requestId}] Task report generated successfully`, {
            reportCost,
            reportTokens,
          })

          // Extract cost from execution logs - sum up costs from all block executions
          const executionCost =
            executionResult?.logs?.reduce((total, log) => {
              return total + (log.output?.cost || 0)
            }, 0) || 0

          const totalCost = {
            workerExecution: executionCost,
            reportGeneration: reportCost || 0,
            total: executionCost + (reportCost || 0),
          }

          // Update task with execution results, generated report, and cost information
          await db
            .update(taskTable)
            .set({
              status: TaskStatus.WORK_COMPLETE,
              rawResult: {
                ...executionResult,
                reportGeneration: {
                  cost: reportCost,
                  tokens: reportTokens,
                  model: 'gemini-2.5-pro',
                },
                totalCost,
              },
              resultReport: taskReport,
            })
            .where(eq(taskTable.id, taskId))

          await db.insert(taskActivityTable).values({
            taskId: taskId,
            actionType: ActionType.TASK_COMPLETED,
            actorId: workerId,
            actorType: ActorType.SYSTEM,
            occurredAt: new Date(),
          })

          // Log cost information for monitoring
          logger.info(`[${requestId}] Task completed with cost tracking`, {
            taskId,
            workerId,
            userId,
            totalCost,
            workerExecutionCost: executionCost,
            reportGenerationCost: reportCost || 0,
            reportTokens,
          })
        } catch (e) {
          logger.error(`[${requestId}] Worker execution failed.`, e)

          // Generate a failure report
          const failureReport = `# Task Report: ${task.title}

## TLDR
Task execution failed due to an error during worker execution.

## Error Details
${e instanceof Error ? e.message : 'Unknown error occurred'}

## Task Information
- **Title**: ${task.title}
- **Description**: ${task.description || 'No description provided'}
- **Status**: Failed
- **Timestamp**: ${new Date().toISOString()}
`

          await db
            .update(taskTable)
            .set({
              status: TaskStatus.ERROR,
              resultReport: failureReport,
              rawResult: {
                error: e instanceof Error ? e.message : 'Unknown error',
                timestamp: new Date().toISOString(),
                totalCost: { workerExecution: 0, reportGeneration: 0, total: 0 },
              },
            })
            .where(eq(taskTable.id, taskId))

          await db.insert(taskActivityTable).values({
            taskId: taskId,
            actionType: ActionType.TASK_FAILED,
            actorId: workerId,
            actorType: ActorType.SYSTEM,
            occurredAt: new Date(),
          })
        }

        logger.info(`[${requestId}] Task processing finished. Deleting message from queue.`)

        await db.execute(sql`SELECT pgmq.delete('task_queue', ${BigInt(msg.msg_id)})`)
      } catch (error) {
        if (error instanceof z.ZodError) {
          logger.error(`[${requestId}] Invalid message format for msg_id: ${msg.msg_id}:`, error)
          // Delete malformed message to prevent retries
          await db.execute(sql`SELECT pgmq.delete('task_queue', ${BigInt(msg.msg_id)})`)
        } else {
          logger.error(`[${requestId}] Error processing message ${msg.msg_id}:`, error)
        }
      }
    })

    await Promise.all(processingPromises)

    return createSuccessResponse({
      message: `Processed ${messages.length} tasks.`,
    })
  } catch (error) {
    logger.error('Error reading from task queue:', error)
    return createErrorResponse('Failed to read from task queue', 500)
  }
}
