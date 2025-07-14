'use client'

import { createLogger } from '@/lib/logger/console-logger'
import { API_ENDPOINTS } from '../constants'
import { useWorkerRegistry } from './registry/store'
import type { WorkerMetadata } from './registry/types'
import { useSubBlockStore } from './subblock/store'
import type { BlockState } from './worker/types'

const logger = createLogger('WorkersDatabase')

/**
 * Fetch workers from database and populate stores
 */
export async function fetchWorkersFromDB(): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    useWorkerRegistry.getState().setLoading(true)

    const activeWorkspaceId = useWorkerRegistry.getState().activeWorkspaceId
    const url = new URL(API_ENDPOINTS.WORKERS, window.location.origin)

    if (activeWorkspaceId) {
      url.searchParams.append('workspaceId', activeWorkspaceId)
    }

    const response = await fetch(url.toString(), { method: 'GET' })

    if (!response.ok) {
      if (response.status === 401) {
        logger.warn('User not authenticated for worker fetch')
        useWorkerRegistry.setState({ workers: {}, isLoading: false })
        return
      }
      throw new Error(`Failed to fetch workers: ${response.statusText}`)
    }

    const { data } = await response.json()

    if (!data || !Array.isArray(data)) {
      logger.info('No workers found in database')
      useWorkerRegistry.setState({ workers: {}, isLoading: false })
      return
    }

    // Process workers
    const registryWorkers: Record<string, WorkerMetadata> = {}
    const deploymentStatuses: Record<string, any> = {}

    data.forEach((worker) => {
      const {
        id,
        name,
        description,
        color,
        state,
        createdAt,
        marketplaceData,
        workspaceId,
        folderId,
        isDeployed,
        deployedAt,
        apiKey,
      } = worker

      // Skip if worker doesn't belong to active workspace
      if (activeWorkspaceId && workspaceId !== activeWorkspaceId) {
        return
      }

      // Add to registry
      registryWorkers[id] = {
        id,
        name,
        description: description || '',
        color: color || '#3972F6',
        lastModified: createdAt ? new Date(createdAt) : new Date(),
        marketplaceData: marketplaceData || null,
        workspaceId,
        folderId: folderId || null,
        blocks: state?.blocks || {},
      }

      // Extract deployment status
      if (isDeployed || deployedAt) {
        deploymentStatuses[id] = {
          isDeployed: isDeployed || false,
          deployedAt: deployedAt ? new Date(deployedAt) : undefined,
          apiKey: apiKey || undefined,
          needsRedeployment: false,
        }
      }

      // Initialize subblock values
      const subblockValues: Record<string, Record<string, any>> = {}
      if (state?.blocks) {
        Object.entries(state.blocks).forEach(([blockId, block]) => {
          const blockState = block as BlockState
          subblockValues[blockId] = {}

          Object.entries(blockState.subBlocks || {}).forEach(([subblockId, subblock]) => {
            subblockValues[blockId][subblockId] = subblock.value
          })
        })
      }

      // Update subblock store
      useSubBlockStore.setState((state) => ({
        workerValues: {
          ...state.workerValues,
          [id]: subblockValues,
        },
      }))
    })

    // Update registry
    useWorkerRegistry.setState({
      workers: registryWorkers,
      deploymentStatuses: deploymentStatuses,
      isLoading: false,
      error: null,
    })

    // Set first worker as active if none set
    const currentState = useWorkerRegistry.getState()
    if (!currentState.activeWorkerId && Object.keys(registryWorkers).length > 0) {
      const firstWorkerId = Object.keys(registryWorkers)[0]
      useWorkerRegistry.setState({ activeWorkerId: firstWorkerId })
      logger.info(`Set first worker as active: ${firstWorkerId}`)
    }

    logger.info(`Successfully loaded ${Object.keys(registryWorkers).length} workers from database`)
  } catch (error) {
    logger.error('Error fetching workers from DB:', error)
    useWorkerRegistry.setState({
      isLoading: false,
      error: `Failed to load workers: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
    throw error
  }
}

/**
 * Fetch a single worker state from the database
 */
export async function fetchWorkerStateFromDB(workerId: string): Promise<any | null> {
  try {
    const response = await fetch(`/api/workers/${workerId}`, { method: 'GET' })

    if (!response.ok) {
      if (response.status === 404) {
        logger.warn(`Worker ${workerId} not found in database`)
        return null
      }
      throw new Error(`Failed to fetch worker: ${response.statusText}`)
    }

    const { data } = await response.json()
    return data
  } catch (error) {
    logger.error(`Error fetching worker ${workerId} from DB:`, error)
    return null
  }
}
