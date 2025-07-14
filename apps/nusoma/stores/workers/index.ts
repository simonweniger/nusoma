import { createLogger } from '@/lib/logger/console-logger'
import { useWorkerRegistry } from './registry/store'
import { mergeSubblockState } from './utils'
import { useWorkerStore } from './worker/store'
import type { BlockState, WorkerState } from './worker/types'

const logger = createLogger('Workers')

/**
 * Get a worker with its state merged in by ID
 * Note: Since localStorage has been removed, this only works for the active worker
 * @param workerId ID of the worker to retrieve
 * @returns The worker with merged state values or null if not found/not active
 */
export function getWorkerWithValues(workerId: string) {
  const { workers } = useWorkerRegistry.getState()
  const activeWorkerId = useWorkerRegistry.getState().activeWorkerId
  const currentState = useWorkerStore.getState()

  if (!workers[workerId]) {
    logger.warn(`Worker ${workerId} not found`)
    return null
  }

  // Since localStorage persistence has been removed, only return data for active worker
  if (workerId !== activeWorkerId) {
    logger.warn(`Cannot get state for non-active worker ${workerId} - localStorage removed`)
    return null
  }

  const metadata = workers[workerId]

  // Get deployment status from registry
  const deploymentStatus = useWorkerRegistry.getState().getWorkerDeploymentStatus(workerId)

  // Use the current state from the store (only available for active worker)
  const workerState: WorkerState = {
    blocks: currentState.blocks,
    edges: currentState.edges,
    loops: currentState.loops,
    parallels: currentState.parallels,
    isDeployed: deploymentStatus?.isDeployed || false,
    deployedAt: deploymentStatus?.deployedAt,
    lastSaved: currentState.lastSaved,
    cursors: currentState.cursors || {},
  }

  // Merge the subblock values for this specific worker
  const mergedBlocks = mergeSubblockState(workerState.blocks, workerId)

  return {
    id: workerId,
    name: metadata.name,
    description: metadata.description,
    color: metadata.color || '#3972F6',
    marketplaceData: metadata.marketplaceData || null,
    workspaceId: metadata.workspaceId,
    folderId: metadata.folderId,
    state: {
      blocks: mergedBlocks,
      edges: workerState.edges,
      loops: workerState.loops,
      parallels: workerState.parallels,
      lastSaved: workerState.lastSaved,
      isDeployed: workerState.isDeployed,
      deployedAt: workerState.deployedAt,
      cursors: workerState.cursors,
    },
  }
}

/**
 * Get a specific block with its subblock values merged in
 * @param blockId ID of the block to retrieve
 * @returns The block with merged subblock values or null if not found
 */
export function getBlockWithValues(blockId: string): BlockState | null {
  const workerState = useWorkerStore.getState()
  const activeWorkerId = useWorkerRegistry.getState().activeWorkerId

  if (!activeWorkerId || !workerState.blocks[blockId]) return null

  const mergedBlocks = mergeSubblockState(workerState.blocks, activeWorkerId, blockId)
  return mergedBlocks[blockId] || null
}

/**
 * Get all workers with their values merged
 * Note: Since localStorage has been removed, this only includes the active worker state
 * @returns An object containing workers, with state only for the active worker
 */
export function getAllWorkersWithValues() {
  const { workers, activeWorkspaceId } = useWorkerRegistry.getState()
  const result: Record<string, any> = {}
  const activeWorkerId = useWorkerRegistry.getState().activeWorkerId
  const currentState = useWorkerStore.getState()

  // Only sync the active worker to ensure we always send valid state data
  if (activeWorkerId && workers[activeWorkerId]) {
    const metadata = workers[activeWorkerId]

    // Skip if worker doesn't belong to the active workspace
    if (activeWorkspaceId && metadata.workspaceId !== activeWorkspaceId) {
      logger.debug(
        `Skipping active worker ${activeWorkerId} - belongs to workspace ${metadata.workspaceId}, not active workspace ${activeWorkspaceId}`
      )
      return result
    }

    // Get deployment status from registry
    const deploymentStatus = useWorkerRegistry.getState().getWorkerDeploymentStatus(activeWorkerId)

    // Ensure state has all required fields for Zod validation
    const workerState: WorkerState = {
      blocks: currentState.blocks || {},
      edges: currentState.edges || [],
      loops: currentState.loops || {},
      parallels: currentState.parallels || {},
      isDeployed: deploymentStatus?.isDeployed || false,
      deployedAt: deploymentStatus?.deployedAt,
      lastSaved: currentState.lastSaved || Date.now(),
      cursors: currentState.cursors || {},
    }

    // Merge the subblock values for this specific worker
    const mergedBlocks = mergeSubblockState(workerState.blocks, activeWorkerId)

    // Include the API key in the state if it exists in the deployment status
    const apiKey = deploymentStatus?.apiKey

    result[activeWorkerId] = {
      id: activeWorkerId,
      name: metadata.name,
      description: metadata.description,
      color: metadata.color || '#3972F6',
      marketplaceData: metadata.marketplaceData || null,
      folderId: metadata.folderId,
      state: {
        blocks: mergedBlocks,
        edges: workerState.edges,
        loops: workerState.loops,
        parallels: workerState.parallels,
        lastSaved: workerState.lastSaved,
        isDeployed: workerState.isDeployed,
        deployedAt: workerState.deployedAt,
        marketplaceData: metadata.marketplaceData || null,
      },
      // Include API key if available
      apiKey,
    }

    // Only include workspaceId if it's not null/undefined
    if (metadata.workspaceId) {
      result[activeWorkerId].workspaceId = metadata.workspaceId
    }
  }

  return result
}

export { useWorkerRegistry } from './registry/store'
export type { WorkerMetadata } from './registry/types'
export { useSubBlockStore } from './subblock/store'
export type { SubBlockStore } from './subblock/types'
export { mergeSubblockState } from './utils'
export { useWorkerStore } from './worker/store'
export type { WorkerState } from './worker/types'
