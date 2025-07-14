import { WorkerIcon } from '@nusoma/design-system/components/icons'
import { createLogger } from '@/lib/logger/console-logger'
import { useWorkerRegistry } from '@/stores/workers/registry/store'
import type { ToolResponse } from '@/tools/types'
import type { BlockConfig } from '../types'

const logger = createLogger('WorkerBlock')

export interface WorkerResponse extends ToolResponse {
  output: {
    success: boolean
    childWorkerName: string
    result: any
    error?: string
  }
}

// Helper function to get available workers for the dropdown
const getAvailableWorkers = (): Array<{ label: string; id: string }> => {
  try {
    const { workers, activeWorkerId } = useWorkerRegistry.getState()

    // Filter out the current worker to prevent recursion
    const availableWorkers = Object.entries(workers)
      .filter(([id]) => id !== activeWorkerId)
      .map(([id, worker]) => ({
        label: worker.name || `Worker ${id.slice(0, 8)}`,
        id: id,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))

    return availableWorkers
  } catch (error) {
    logger.error('Error getting available workers:', error)
    return []
  }
}

export const WorkerBlock: BlockConfig = {
  type: 'worker',
  name: 'Worker',
  description: 'Execute another worker',
  category: 'blocks',
  bgColor: '#705335',
  icon: WorkerIcon,
  subBlocks: [
    {
      id: 'workerId',
      title: 'Select Worker',
      type: 'dropdown',
      options: getAvailableWorkers,
    },
    {
      id: 'input',
      title: 'Input Variable (Optional)',
      type: 'short-input',
      placeholder: 'Select a variable to pass to the child worker',
      description: 'This variable will be available as start.response.input in the child worker',
    },
  ],
  tools: {
    access: ['worker_executor'],
  },
  inputs: {
    workerId: {
      type: 'string',
      required: true,
      description: 'ID of the worker to execute',
    },
    input: {
      type: 'string',
      required: false,
      description: 'Variable reference to pass to the child worker',
    },
  },
  outputs: {
    response: {
      type: {
        success: 'boolean',
        childWorkerName: 'string',
        result: 'json',
        error: 'string',
      },
    },
  },
}
