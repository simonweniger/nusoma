import { createLogger } from '@/lib/logger/console-logger'
import type { ToolConfig, ToolResponse } from '@/tools/types'

const logger = createLogger('WorkerExecutorTool')

interface WorkerExecutorParams {
  workerId: string
  inputMapping?: Record<string, any>
}

interface WorkerExecutorResponse extends ToolResponse {
  output: {
    success: boolean
    duration: number
    childWorkerId: string
    childWorkerName: string
    [key: string]: any
  }
}

/**
 * Tool for executing workers as blocks within other workers.
 * This tool is used by the WorkerBlockHandler to provide the execution capability.
 */
export const workerExecutorTool: ToolConfig<
  WorkerExecutorParams,
  WorkerExecutorResponse['output']
> = {
  id: 'worker_executor',
  name: 'Worker Executor',
  description: 'Execute another worker inline as a block',
  version: '1.0.0',
  params: {
    workerId: {
      type: 'string',
      required: true,
      description: 'The ID of the worker to execute',
    },
    inputMapping: {
      type: 'object',
      required: false,
      description: 'JSON object mapping parent data to child worker inputs',
    },
  },
  request: {
    url: '/api/tools/worker-executor',
    method: 'POST',
    headers: () => ({ 'Content-Type': 'application/json' }),
    body: (params) => params,
    isInternalRoute: true,
  },
  transformResponse: async (response: any) => {
    logger.info('Worker executor tool response received', { response })

    // Extract success state from response, default to false if not present
    const success = response?.success ?? false

    return {
      success,
      duration: response?.duration ?? 0,
      childWorkerId: response?.childWorkerId ?? '',
      childWorkerName: response?.childWorkerName ?? '',
      ...response,
    }
  },
  transformError: (error: any) => {
    logger.error('Worker executor tool error:', error)

    return error.message || 'Worker execution failed'
  },
}
