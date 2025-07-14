'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createLogger } from '@/lib/logger/console-logger'
import { useWorkerRegistry } from './registry/store'
import type { WorkerMetadata } from './registry/types'
import { generateUniqueName, getNextWorkerColor } from './registry/utils'

const logger = createLogger('WorkerMutations')

interface CreateWorkerOptions {
  name?: string
  description?: string
  workspaceId?: string
  isInitial?: boolean
  marketplaceId?: string
  marketplaceState?: any
  workerId?: string
}

interface CreateWorkerRequest {
  name: string
  description: string
  color: string
  workspaceId?: string
  state: {
    blocks: Record<string, any>
    edges: any[]
    loops: Record<string, any>
    parallels: Record<string, any>
  }
  marketplaceData?: {
    id: string
    status: 'owner' | 'temp'
  }
  workerId?: string
}

/**
 * Hook to create a new worker using TanStack Query mutation
 */
export function useCreateWorker() {
  const queryClient = useQueryClient()
  const { workers, activeWorkspaceId } = useWorkerRegistry()

  return useMutation<any, Error, CreateWorkerOptions>({
    mutationFn: async (options: CreateWorkerOptions) => {
      logger.info('Creating worker via API...', options)

      // Use provided workspace ID or fall back to active workspace ID
      const workspaceId = options.workspaceId || activeWorkspaceId || undefined

      // Generate worker metadata
      const name = options.name || generateUniqueName(workers)
      const description = options.description || 'New worker'
      const color = options.marketplaceId ? '#808080' : getNextWorkerColor(workers)

      const requestData = {
        name,
        description,
        color,
        workspaceId,
        marketplaceData: options.marketplaceId
          ? { id: options.marketplaceId, status: 'temp' as const }
          : undefined,
        ...(options.workerId ? { workerId: options.workerId } : {}),
      }

      // Call the API to create worker
      const response = await fetch('/api/workers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to create worker: ${response.statusText}`)
      }

      const result = await response.json()
      logger.info('Worker created successfully:', result)

      return result
    },
    onSuccess: (data, variables) => {
      logger.info('Worker creation successful, updating local state...', data)

      // Update the worker registry with the new worker
      const newWorker: WorkerMetadata = {
        id: data.id,
        name: data.name,
        lastModified: new Date(data.updatedAt),
        blocks: {}, // Start with empty blocks, will be populated by realtime store
        description: data.description,
        color: data.color,
        marketplaceData: data.marketplaceData || undefined,
        workspaceId: data.workspaceId,
      }

      // Add to worker registry and set as active
      // The realtime store will handle loading the full worker state
      useWorkerRegistry.setState((state) => ({
        workers: {
          ...state.workers,
          [data.id]: newWorker,
        },
        activeWorkerId: data.id,
        error: null,
      }))

      // Invalidate workers query to ensure list is updated
      queryClient.invalidateQueries({
        queryKey: ['workers', data.workspaceId],
      })

      logger.info(
        `Created new worker with ID ${data.id} in workspace ${data.workspaceId || 'none'}`
      )
    },
    onError: (error) => {
      logger.error('Error creating worker:', error)

      // Set error in registry
      useWorkerRegistry.setState({ error: error.message })
    },
  })
}
