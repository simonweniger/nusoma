import { db } from '@nusoma/database'
import { workerBlocks, workerEdges, workerSubflows } from '@nusoma/database/schema'
import { eq } from 'drizzle-orm'
import { createLogger } from '@/lib/logger/console-logger'
import type { WorkerState } from '@/stores/workers/worker/types'
import { SUBFLOW_TYPES } from '@/stores/workers/worker/types'

const logger = createLogger('WorkerDBHelpers')

export interface NormalizedWorkerData {
  blocks: Record<string, any>
  edges: any[]
  loops: Record<string, any>
  parallels: Record<string, any>
  isFromNormalizedTables: true // Flag to indicate this came from new tables
}

/**
 * Load worker state from normalized tables
 * Returns null if no data found (fallback to JSON blob)
 */
export async function loadWorkerFromNormalizedTables(
  workerId: string
): Promise<NormalizedWorkerData | null> {
  try {
    // Load all components in parallel
    const [blocks, edges, subflows] = await Promise.all([
      db.select().from(workerBlocks).where(eq(workerBlocks.workerId, workerId)),
      db.select().from(workerEdges).where(eq(workerEdges.workerId, workerId)),
      db.select().from(workerSubflows).where(eq(workerSubflows.workerId, workerId)),
    ])

    // If no blocks found, assume this worker hasn't been migrated yet
    if (blocks.length === 0) {
      return null
    }

    // Convert blocks to the expected format
    const blocksMap: Record<string, any> = {}
    blocks.forEach((block) => {
      blocksMap[block.id] = {
        id: block.id,
        type: block.type,
        name: block.name,
        position: {
          x: Number(block.positionX),
          y: Number(block.positionY),
        },
        enabled: block.enabled,
        horizontalHandles: block.horizontalHandles,
        isWide: block.isWide,
        height: Number(block.height),
        subBlocks: block.subBlocks || {},
        outputs: block.outputs || {},
        data: block.data || {},
        parentId: (block.data as any)?.parentId || null,
        extent: (block.data as any)?.extent || null,
      }
    })

    // Convert edges to the expected format
    const edgesArray = edges.map((edge) => ({
      id: edge.id,
      source: edge.sourceBlockId,
      target: edge.targetBlockId,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
    }))

    // Convert subflows to loops and parallels
    const loops: Record<string, any> = {}
    const parallels: Record<string, any> = {}

    subflows.forEach((subflow) => {
      const config = subflow.config || {}

      if (subflow.type === SUBFLOW_TYPES.LOOP) {
        loops[subflow.id] = {
          id: subflow.id,
          ...config,
        }
      } else if (subflow.type === SUBFLOW_TYPES.PARALLEL) {
        parallels[subflow.id] = {
          id: subflow.id,
          ...config,
        }
      } else {
        logger.warn(`Unknown subflow type: ${subflow.type} for subflow ${subflow.id}`)
      }
    })

    logger.info(
      `Loaded worker ${workerId} from normalized tables: ${blocks.length} blocks, ${edges.length} edges, ${subflows.length} subflows`
    )

    return {
      blocks: blocksMap,
      edges: edgesArray,
      loops,
      parallels,
      isFromNormalizedTables: true,
    }
  } catch (error) {
    logger.error(`Error loading worker ${workerId} from normalized tables:`, error)
    return null
  }
}

/**
 * Save worker state to normalized tables
 * Also returns the JSON blob for backward compatibility
 */
export async function saveWorkerToNormalizedTables(
  workerId: string,
  state: WorkerState
): Promise<{ success: boolean; jsonBlob?: any; error?: string }> {
  try {
    // Start a transaction
    const result = await db.transaction(async (tx) => {
      // Clear existing data for this worker
      await Promise.all([
        tx.delete(workerBlocks).where(eq(workerBlocks.workerId, workerId)),
        tx.delete(workerEdges).where(eq(workerEdges.workerId, workerId)),
        tx.delete(workerSubflows).where(eq(workerSubflows.workerId, workerId)),
      ])

      // Insert blocks
      if (Object.keys(state.blocks).length > 0) {
        const blockInserts = Object.values(state.blocks).map((block) => ({
          id: block.id,
          workerId: workerId,
          type: block.type,
          name: block.name || '',
          positionX: String(block.position?.x || 0),
          positionY: String(block.position?.y || 0),
          enabled: block.enabled ?? true,
          horizontalHandles: block.horizontalHandles ?? false,
          isWide: block.isWide ?? false,
          height: String(block.height || 0),
          subBlocks: block.subBlocks || {},
          outputs: block.outputs || {},
          data: block.data || {},
          parentId: block.data?.parentId || null,
          extent: block.data?.extent || null,
        }))

        await tx.insert(workerBlocks).values(blockInserts)
      }

      // Insert edges
      if (state.edges.length > 0) {
        const edgeInserts = state.edges.map((edge) => ({
          id: edge.id,
          workerId: workerId,
          sourceBlockId: edge.source,
          targetBlockId: edge.target,
          sourceHandle: edge.sourceHandle || null,
          targetHandle: edge.targetHandle || null,
        }))

        await tx.insert(workerEdges).values(edgeInserts)
      }

      // Insert subflows (loops and parallels)
      const subflowInserts: any[] = []

      // Add loops
      Object.values(state.loops || {}).forEach((loop) => {
        subflowInserts.push({
          id: loop.id,
          workerId: workerId,
          type: SUBFLOW_TYPES.LOOP,
          config: loop,
        })
      })

      // Add parallels
      Object.values(state.parallels || {}).forEach((parallel) => {
        subflowInserts.push({
          id: parallel.id,
          workerId: workerId,
          type: SUBFLOW_TYPES.PARALLEL,
          config: parallel,
        })
      })

      if (subflowInserts.length > 0) {
        await tx.insert(workerSubflows).values(subflowInserts)
      }

      return { success: true }
    })

    // Create JSON blob for backward compatibility
    const jsonBlob = {
      blocks: state.blocks,
      edges: state.edges,
      loops: state.loops || {},
      parallels: state.parallels || {},
      lastSaved: Date.now(),
      isDeployed: state.isDeployed,
      deployedAt: state.deployedAt,
      deploymentStatuses: state.deploymentStatuses,
      hasActiveSchedule: state.hasActiveSchedule,
      hasActiveWebhook: state.hasActiveWebhook,
    }

    logger.info(`Successfully saved worker ${workerId} to normalized tables`)

    return {
      success: true,
      jsonBlob,
    }
  } catch (error) {
    logger.error(`Error saving worker ${workerId} to normalized tables:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Check if a worker exists in normalized tables
 */
export async function workerExistsInNormalizedTables(workerId: string): Promise<boolean> {
  try {
    const blocks = await db
      .select({ id: workerBlocks.id })
      .from(workerBlocks)
      .where(eq(workerBlocks.workerId, workerId))
      .limit(1)

    return blocks.length > 0
  } catch (error) {
    logger.error(`Error checking if worker ${workerId} exists in normalized tables:`, error)
    return false
  }
}
