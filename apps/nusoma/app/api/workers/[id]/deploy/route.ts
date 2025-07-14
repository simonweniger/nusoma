import { db } from '@nusoma/database'
import { apiKey, worker, workerBlocks, workerEdges, workerSubflows } from '@nusoma/database/schema'
import { eq } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { createLogger } from '@/lib/logger/console-logger'
import { generateApiKey } from '@/lib/utils'
import { validateWorkerAccess } from '../../middleware'
import { createErrorResponse, createSuccessResponse } from '../../utils'

const logger = createLogger('WorkerDeployAPI')

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const { id } = await params

  try {
    logger.debug(`[${requestId}] Fetching deployment info for worker: ${id}`)
    const validation = await validateWorkerAccess(request, id, false)

    if (validation.error) {
      logger.warn(`[${requestId}] Failed to fetch deployment info: ${validation.error.message}`)
      return createErrorResponse(validation.error.message, validation.error.status)
    }

    // Fetch the worker information including deployment details
    const result = await db
      .select({
        isDeployed: worker.isDeployed,
        deployedAt: worker.deployedAt,
        userId: worker.userId,
        deployedState: worker.deployedState,
      })
      .from(worker)
      .where(eq(worker.id, id))
      .limit(1)

    if (result.length === 0) {
      logger.warn(`[${requestId}] Worker not found: ${id}`)
      return createErrorResponse('Worker not found', 404)
    }

    const workerData = result[0]

    // If the worker is not deployed, return appropriate response
    if (!workerData.isDeployed) {
      logger.info(`[${requestId}] Worker is not deployed: ${id}`)
      return createSuccessResponse({
        isDeployed: false,
        deployedAt: null,
        apiKey: null,
        needsRedeployment: false,
      })
    }

    // Fetch the user's API key
    const userApiKey = await db
      .select({
        key: apiKey.key,
      })
      .from(apiKey)
      .where(eq(apiKey.userId, workerData.userId))
      .limit(1)

    let userKey = null

    // If no API key exists, create one automatically
    if (userApiKey.length === 0) {
      try {
        const newApiKey = generateApiKey()
        await db.insert(apiKey).values({
          id: uuidv4(),
          userId: workerData.userId,
          name: 'Default API Key',
          key: newApiKey,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        userKey = newApiKey
        logger.info(`[${requestId}] Generated new API key for user: ${workerData.userId}`)
      } catch (keyError) {
        // If key generation fails, log the error but continue with the request
        logger.error(`[${requestId}] Failed to generate API key:`, keyError)
      }
    } else {
      userKey = userApiKey[0].key
    }

    // Check if the worker has meaningful changes that would require redeployment
    let needsRedeployment = false
    if (workerData.deployedState) {
      // Load current state from normalized tables for comparison
      const { loadWorkerFromNormalizedTables } = await import('@/lib/workers/db-helpers')
      const normalizedData = await loadWorkerFromNormalizedTables(id)

      if (normalizedData) {
        // Convert normalized data to WorkerState format for comparison
        const currentState = {
          blocks: normalizedData.blocks,
          edges: normalizedData.edges,
          loops: normalizedData.loops,
          parallels: normalizedData.parallels,
        }

        const { hasWorkerChanged } = await import('@/lib/workers/utils')
        needsRedeployment = hasWorkerChanged(currentState as any, workerData.deployedState as any)
      }
    }

    logger.info(`[${requestId}] Successfully retrieved deployment info: ${id}`)
    return createSuccessResponse({
      apiKey: userKey,
      isDeployed: workerData.isDeployed,
      deployedAt: workerData.deployedAt,
      needsRedeployment,
    })
  } catch (error: any) {
    logger.error(`[${requestId}] Error fetching deployment info: ${id}`, error)
    return createErrorResponse(error.message || 'Failed to fetch deployment information', 500)
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const { id } = await params

  try {
    logger.debug(`[${requestId}] Deploying worker: ${id}`)
    const validation = await validateWorkerAccess(request, id, false)

    if (validation.error) {
      logger.warn(`[${requestId}] Worker deployment failed: ${validation.error.message}`)
      return createErrorResponse(validation.error.message, validation.error.status)
    }

    // Get the worker to find the user (removed deprecated state column)
    const workerData = await db
      .select({
        userId: worker.userId,
      })
      .from(worker)
      .where(eq(worker.id, id))
      .limit(1)

    if (workerData.length === 0) {
      logger.warn(`[${requestId}] Worker not found: ${id}`)
      return createErrorResponse('Worker not found', 404)
    }

    const userId = workerData[0].userId

    // Get the current live state from normalized tables instead of stale JSON
    logger.debug(`[${requestId}] Getting current worker state for deployment`)

    // Get blocks from normalized table
    const blocks = await db.select().from(workerBlocks).where(eq(workerBlocks.workerId, id))

    // Get edges from normalized table
    const edges = await db.select().from(workerEdges).where(eq(workerEdges.workerId, id))

    // Get subflows from normalized table
    const subflows = await db.select().from(workerSubflows).where(eq(workerSubflows.workerId, id))

    // Build current state from normalized data
    const blocksMap: Record<string, any> = {}
    const loops: Record<string, any> = {}
    const parallels: Record<string, any> = {}

    // Process blocks
    blocks.forEach((block) => {
      blocksMap[block.id] = {
        id: block.id,
        type: block.type,
        name: block.name,
        position: { x: Number(block.positionX), y: Number(block.positionY) },
        data: block.data,
        enabled: block.enabled,
        subBlocks: block.subBlocks || {},
      }
    })

    // Process subflows (loops and parallels)
    subflows.forEach((subflow) => {
      const config = (subflow.config as any) || {}
      if (subflow.type === 'loop') {
        loops[subflow.id] = {
          nodes: config.nodes || [],
          iterationCount: config.iterationCount || 1,
          iterationType: config.iterationType || 'fixed',
          collection: config.collection || '',
        }
      } else if (subflow.type === 'parallel') {
        parallels[subflow.id] = {
          nodes: config.nodes || [],
          parallelCount: config.parallelCount || 2,
          collection: config.collection || '',
        }
      }
    })

    // Convert edges to the expected format
    const edgesArray = edges.map((edge) => ({
      id: edge.id,
      source: edge.sourceBlockId,
      target: edge.targetBlockId,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: 'default',
      data: {},
    }))

    const currentState = {
      blocks: blocksMap,
      edges: edgesArray,
      loops,
      parallels,
      lastSaved: Date.now(),
    }

    logger.debug(`[${requestId}] Current state retrieved from normalized tables:`, {
      blocksCount: Object.keys(blocksMap).length,
      edgesCount: edgesArray.length,
      loopsCount: Object.keys(loops).length,
      parallelsCount: Object.keys(parallels).length,
    })

    if (!currentState || !currentState.blocks) {
      logger.error(`[${requestId}] Invalid worker state retrieved`, { currentState })
      throw new Error('Invalid worker state: missing blocks')
    }

    const deployedAt = new Date()
    logger.debug(`[${requestId}] Proceeding with deployment at ${deployedAt.toISOString()}`)

    // Check if the user already has an API key
    const userApiKey = await db
      .select({
        key: apiKey.key,
      })
      .from(apiKey)
      .where(eq(apiKey.userId, userId))
      .limit(1)

    let userKey = null

    // If no API key exists, create one
    if (userApiKey.length === 0) {
      try {
        const newApiKey = generateApiKey()
        await db.insert(apiKey).values({
          id: uuidv4(),
          userId,
          name: 'Default API Key',
          key: newApiKey,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        userKey = newApiKey
        logger.info(`[${requestId}] Generated new API key for user: ${userId}`)
      } catch (keyError) {
        // If key generation fails, log the error but continue with the request
        logger.error(`[${requestId}] Failed to generate API key:`, keyError)
      }
    } else {
      userKey = userApiKey[0].key
    }

    // Update the worker deployment status and save current state as deployed state
    await db
      .update(worker)
      .set({
        isDeployed: true,
        deployedAt,
        deployedState: currentState,
      })
      .where(eq(worker.id, id))

    logger.info(`[${requestId}] Worker deployed successfully: ${id}`)
    return createSuccessResponse({ apiKey: userKey, isDeployed: true, deployedAt })
  } catch (error: any) {
    logger.error(`[${requestId}] Error deploying worker: ${id}`, {
      error: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause,
      fullError: error,
    })
    return createErrorResponse(error.message || 'Failed to deploy worker', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const { id } = await params

  try {
    logger.debug(`[${requestId}] Undeploying worker: ${id}`)
    const validation = await validateWorkerAccess(request, id, false)

    if (validation.error) {
      logger.warn(`[${requestId}] Worker undeployment failed: ${validation.error.message}`)
      return createErrorResponse(validation.error.message, validation.error.status)
    }

    // Update the worker to remove deployment status and deployed state
    await db
      .update(worker)
      .set({
        isDeployed: false,
        deployedAt: null,
        deployedState: null,
      })
      .where(eq(worker.id, id))

    logger.info(`[${requestId}] Worker undeployed successfully: ${id}`)
    return createSuccessResponse({
      isDeployed: false,
      deployedAt: null,
      apiKey: null,
    })
  } catch (error: any) {
    logger.error(`[${requestId}] Error undeploying worker: ${id}`, error)
    return createErrorResponse(error.message || 'Failed to undeploy worker', 500)
  }
}
