import { db } from '@nusoma/database'
import { worker, workerBlocks, workerEdges, workerSubflows } from '@nusoma/database/schema'
import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth-server'
import { createLogger } from '@/lib/logger/console-logger'
import { getUserEntityPermissions, hasAdminPermission } from '@/lib/permissions/utils'
import { loadWorkerFromNormalizedTables } from '@/lib/workers/db-helpers'

const logger = createLogger('WorkerByIdAPI')

const UpdateWorkerSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  folderId: z.string().nullable().optional(),
})

/**
 * GET /api/workers/[id]
 * Fetch a single worker by ID
 * Uses hybrid approach: try normalized tables first, fallback to JSON blob
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()
  const { id: workerId } = await params

  try {
    // Get the session
    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized access attempt for worker ${workerId}`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Fetch the worker
    const workerData = await db
      .select()
      .from(worker)
      .where(eq(worker.id, workerId))
      .then((rows) => rows[0])

    if (!workerData) {
      logger.warn(`[${requestId}] Worker ${workerId} not found`)
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    // Check if user has access to this worker
    let hasAccess = false

    // Case 1: User owns the worker
    if (workerData.userId === userId) {
      hasAccess = true
    }

    // Case 2: Worker belongs to a workspace the user has permissions for
    if (!hasAccess && workerData.workspaceId) {
      const userPermission = await getUserEntityPermissions(
        userId,
        'workspace',
        workerData.workspaceId
      )
      if (userPermission !== null) {
        hasAccess = true
      }
    }

    if (!hasAccess) {
      logger.warn(`[${requestId}] User ${userId} denied access to worker ${workerId}`)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Try to load from normalized tables first
    logger.debug(`[${requestId}] Attempting to load worker ${workerId} from normalized tables`)
    const normalizedData = await loadWorkerFromNormalizedTables(workerId)

    const finalWorkerData = {
      ...workerData,
      state: {
        deploymentStatuses: {},
        hasActiveSchedule: false,
        hasActiveWebhook: false,
        blocks: normalizedData?.blocks || {},
        edges: normalizedData?.edges || [],
        loops: normalizedData?.loops || {},
        parallels: normalizedData?.parallels || {},
        lastSaved: Date.now(),
        isDeployed: workerData.isDeployed || false,
        deployedAt: workerData.deployedAt,
      },
    }

    if (normalizedData) {
      logger.info(`[${requestId}] Loaded worker ${workerId} from normalized tables`)
    } else {
      logger.info(
        `[${requestId}] Created default state for worker ${workerId} - no normalized data found`
      )
    }

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Successfully fetched worker ${workerId} in ${elapsed}ms`)

    return NextResponse.json({ data: finalWorkerData }, { status: 200 })
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    logger.error(`[${requestId}] Error fetching worker ${workerId} after ${elapsed}ms`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/workers/[id]
 * Delete a worker by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()
  const { id: workerId } = await params

  try {
    // Get the session
    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized deletion attempt for worker ${workerId}`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Fetch the worker to check ownership/access
    const workerData = await db
      .select()
      .from(worker)
      .where(eq(worker.id, workerId))
      .then((rows) => rows[0])

    if (!workerData) {
      logger.warn(`[${requestId}] Worker ${workerId} not found for deletion`)
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    // Check if user has permission to delete this worker
    let canDelete = false

    // Case 1: User owns the worker
    if (workerData.userId === userId) {
      canDelete = true
    }

    // Case 2: Worker belongs to a workspace and user has admin permission
    if (!canDelete && workerData.workspaceId) {
      const hasAdmin = await hasAdminPermission(userId, workerData.workspaceId)
      if (hasAdmin) {
        canDelete = true
      }
    }

    if (!canDelete) {
      logger.warn(`[${requestId}] User ${userId} denied permission to delete worker ${workerId}`)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Delete worker and all related data in a transaction
    await db.transaction(async (tx) => {
      // Delete from normalized tables first (foreign key constraints)
      await tx.delete(workerSubflows).where(eq(workerSubflows.workerId, workerId))
      await tx.delete(workerEdges).where(eq(workerEdges.workerId, workerId))
      await tx.delete(workerBlocks).where(eq(workerBlocks.workerId, workerId))

      // Delete the main worker record
      await tx.delete(worker).where(eq(worker.id, workerId))
    })

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Successfully deleted worker ${workerId} in ${elapsed}ms`)

    // Notify Socket.IO system to disconnect users from this worker's room
    // This prevents "Block not found" errors when collaborative updates try to process
    // after the worker has been deleted
    try {
      const socketUrl = process.env.SOCKET_SERVER_URL || 'http://localhost:3002'
      const socketResponse = await fetch(`${socketUrl}/api/worker-deleted`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId }),
      })

      if (socketResponse.ok) {
        logger.info(`[${requestId}] Notified Socket.IO server about worker ${workerId} deletion`)
      } else {
        logger.warn(
          `[${requestId}] Failed to notify Socket.IO server about worker ${workerId} deletion`
        )
      }
    } catch (error) {
      logger.warn(
        `[${requestId}] Error notifying Socket.IO server about worker ${workerId} deletion:`,
        error
      )
      // Don't fail the deletion if Socket.IO notification fails
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    logger.error(`[${requestId}] Error deleting worker ${workerId} after ${elapsed}ms`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/workers/[id]
 * Update worker metadata (name, description, color, folderId)
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()
  const { id: workerId } = await params

  try {
    // Get the session
    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized update attempt for worker ${workerId}`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Parse and validate request body
    const body = await request.json()
    const updates = UpdateWorkerSchema.parse(body)

    // Fetch the worker to check ownership/access
    const workerData = await db
      .select()
      .from(worker)
      .where(eq(worker.id, workerId))
      .then((rows) => rows[0])

    if (!workerData) {
      logger.warn(`[${requestId}] Worker ${workerId} not found for update`)
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    // Check if user has permission to update this worker
    let canUpdate = false

    // Case 1: User owns the worker
    if (workerData.userId === userId) {
      canUpdate = true
    }

    // Case 2: Worker belongs to a workspace and user has write or admin permission
    if (!canUpdate && workerData.workspaceId) {
      const userPermission = await getUserEntityPermissions(
        userId,
        'workspace',
        workerData.workspaceId
      )
      if (userPermission === 'write' || userPermission === 'admin') {
        canUpdate = true
      }
    }

    if (!canUpdate) {
      logger.warn(`[${requestId}] User ${userId} denied permission to update worker ${workerId}`)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build update object
    const updateData: any = { updatedAt: new Date() }
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.color !== undefined) updateData.color = updates.color
    if (updates.folderId !== undefined) updateData.folderId = updates.folderId

    // Update the worker
    const [updatedWorker] = await db
      .update(worker)
      .set(updateData)
      .where(eq(worker.id, workerId))
      .returning()

    const elapsed = Date.now() - startTime
    logger.info(`[${requestId}] Successfully updated worker ${workerId} in ${elapsed}ms`, {
      updates: updateData,
    })

    return NextResponse.json({ worker: updatedWorker }, { status: 200 })
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    if (error instanceof z.ZodError) {
      logger.warn(`[${requestId}] Invalid worker update data for ${workerId}`, {
        errors: error.errors,
      })
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] Error updating worker ${workerId} after ${elapsed}ms`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
