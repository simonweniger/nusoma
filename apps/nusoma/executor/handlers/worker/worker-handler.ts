import { createLogger } from '@/lib/logger/console-logger'
import type { BlockOutput } from '@/blocks/types'
import { Serializer } from '@/serializer'
import type { SerializedBlock } from '@/serializer/types'
import { useWorkerRegistry } from '@/stores/workers/registry/store'
import { Executor } from '../../index'
import type { BlockHandler, ExecutionContext, StreamingExecution } from '../../types'

const logger = createLogger('WorkerBlockHandler')

// Maximum allowed depth for nested worker executions
const MAX_WORKER_DEPTH = 10

/**
 * Handler for worker blocks that execute other workers inline.
 * Creates sub-execution contexts and manages data flow between parent and child workers.
 */
export class WorkerBlockHandler implements BlockHandler {
  private serializer = new Serializer()
  private static executionStack = new Set<string>()

  canHandle(block: SerializedBlock): boolean {
    return block.metadata?.id === 'worker'
  }

  async execute(
    block: SerializedBlock,
    inputs: Record<string, any>,
    context: ExecutionContext
  ): Promise<BlockOutput | StreamingExecution> {
    logger.info(`Executing worker block: ${block.id}`)

    const workerId = inputs.workerId

    if (!workerId) {
      throw new Error('No worker selected for execution')
    }

    try {
      // Check execution depth
      const currentDepth = (context.workerId?.split('_sub_').length || 1) - 1
      if (currentDepth >= MAX_WORKER_DEPTH) {
        throw new Error(`Maximum worker nesting depth of ${MAX_WORKER_DEPTH} exceeded`)
      }

      // Check for cycles
      const executionId = `${context.workerId}_sub_${workerId}`
      if (WorkerBlockHandler.executionStack.has(executionId)) {
        throw new Error(`Cyclic worker dependency detected: ${executionId}`)
      }

      // Add current execution to stack
      WorkerBlockHandler.executionStack.add(executionId)

      // Load the child worker from API
      const childWorker = await this.loadChildWorker(workerId)

      if (!childWorker) {
        throw new Error(`Child worker ${workerId} not found`)
      }

      // Get worker metadata for logging
      const { workers } = useWorkerRegistry.getState()
      const workerMetadata = workers[workerId]
      const childWorkerName = workerMetadata?.name || childWorker.name || 'Unknown Worker'

      logger.info(
        `Executing child worker: ${childWorkerName} (${workerId}) at depth ${currentDepth}`
      )

      // Prepare the input for the child worker
      // The input from this block should be passed as start.response.input to the child worker
      let childWorkerInput = {}

      if (inputs.input !== undefined) {
        // If input is provided, use it directly
        childWorkerInput = inputs.input
        logger.info(`Passing input to child worker: ${JSON.stringify(childWorkerInput)}`)
      }

      // Remove the workerId from the input to avoid confusion
      const { workerId: _, input: __, ...otherInputs } = inputs

      // Execute child worker inline
      const subExecutor = new Executor({
        worker: childWorker.serializedState,
        workerInput: childWorkerInput,
        envVarValues: context.environmentVariables,
      })

      const startTime = performance.now()
      const result = await subExecutor.execute(executionId)
      const duration = performance.now() - startTime

      // Remove current execution from stack after completion
      WorkerBlockHandler.executionStack.delete(executionId)

      // Log execution completion
      logger.info(`Child worker ${childWorkerName} completed in ${Math.round(duration)}ms`)

      // Map child worker output to parent block output
      return this.mapChildOutputToParent(result, workerId, childWorkerName, duration)
    } catch (error: any) {
      logger.error(`Error executing child worker ${workerId}:`, error)

      // Clean up execution stack in case of error
      const executionId = `${context.workerId}_sub_${workerId}`
      WorkerBlockHandler.executionStack.delete(executionId)

      // Get worker name for error reporting
      const { workers } = useWorkerRegistry.getState()
      const workerMetadata = workers[workerId]
      const childWorkerName = workerMetadata?.name || workerId

      return {
        success: false,
        error: error.message || 'Child worker execution failed',
        childWorkerName: childWorkerName,
      } as Record<string, any>
    }
  }

  /**
   * Loads a child worker from the API
   */
  private async loadChildWorker(workerId: string) {
    try {
      // Fetch worker from API
      const response = await fetch(`/api/workers/${workerId}`)

      if (!response.ok) {
        if (response.status === 404) {
          logger.error(`Child worker ${workerId} not found`)
          return null
        }
        throw new Error(`Failed to fetch worker: ${response.status} ${response.statusText}`)
      }

      const { data: workerData } = await response.json()

      if (!workerData) {
        logger.error(`Child worker ${workerId} returned empty data`)
        return null
      }

      logger.info(`Loaded child worker: ${workerData.name} (${workerId})`)

      // Extract the worker state
      const workerState = workerData.state

      if (!workerState || !workerState.blocks) {
        logger.error(`Child worker ${workerId} has invalid state`)
        return null
      }

      // Use blocks directly since DB format should match UI format
      const serializedWorker = this.serializer.serializeWorker(
        workerState.blocks,
        workerState.edges || [],
        workerState.loops || {},
        workerState.parallels || {}
      )

      return {
        name: workerData.name,
        serializedState: serializedWorker,
      }
    } catch (error) {
      logger.error(`Error loading child worker ${workerId}:`, error)
      return null
    }
  }

  /**
   * Maps child worker output to parent block output format
   */
  private mapChildOutputToParent(
    childResult: any,
    childWorkerId: string,
    childWorkerName: string,
    duration: number
  ): BlockOutput {
    const success = childResult.success !== false

    // If child worker failed, return minimal output
    if (!success) {
      logger.warn(`Child worker ${childWorkerName} failed`)
      return {
        response: {
          success: false,
          childWorkerName,
          error: childResult.error || 'Child worker execution failed',
        },
      } as Record<string, any>
    }

    // Extract the actual result content from the nested structure
    let result = childResult
    if (childResult?.output?.response) {
      result = childResult.output.response
    } else if (childResult?.response?.response) {
      result = childResult.response.response
    }

    // Return a properly structured response with all required fields
    return {
      response: {
        success: true,
        childWorkerName,
        result,
      },
    } as Record<string, any>
  }
}
