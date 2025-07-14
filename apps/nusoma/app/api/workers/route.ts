import { db } from '@nusoma/database'
import { worker, workerBlocks, workspace, workspaceMember } from '@nusoma/database/schema'
import { and, eq } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth-server'
import { createLogger } from '@/lib/logger/console-logger'
import { getUserEntityPermissions } from '@/lib/permissions/utils'
import { createErrorResponse, createSuccessResponse } from './utils'

const logger = createLogger('WorkerAPI')

// Schema for creating a new worker
const CreateWorkerSchema = z.object({
  name: z.string().min(1, 'Worker name is required'),
  description: z.string().default(''),
  color: z.string().default('#3972F6'),
  workspaceId: z.string().optional(),
  marketplaceData: z
    .object({
      id: z.string(),
      status: z.enum(['owner', 'temp']),
    })
    .nullable()
    .optional(),
})

// Cache for workspace membership to reduce DB queries (reusing pattern from sync route)
const workspaceMembershipCache = new Map<string, { role: string; expires: number }>()
const CACHE_TTL = 60000 // 1 minute cache expiration

/**
 * Efficiently verifies user's membership and role in a workspace with caching
 */
async function verifyWorkspaceMembership(
  userId: string,
  workspaceId: string
): Promise<string | null> {
  const cacheKey = `${userId}:${workspaceId}`

  // Check cache first
  const cached = workspaceMembershipCache.get(cacheKey)
  if (cached && cached.expires > Date.now()) {
    return cached.role
  }

  // If not in cache or expired, query the database
  try {
    const membership = await db
      .select({ role: workspaceMember.role })
      .from(workspaceMember)
      .where(and(eq(workspaceMember.workspaceId, workspaceId), eq(workspaceMember.userId, userId)))
      .then((rows) => rows[0])

    if (!membership) {
      return null
    }

    // Cache the result
    workspaceMembershipCache.set(cacheKey, {
      role: membership.role,
      expires: Date.now() + CACHE_TTL,
    })

    return membership.role
  } catch (error) {
    logger.error(`Error verifying workspace membership for ${userId} in ${workspaceId}:`, error)
    return null
  }
}

/**
 * GET /api/workers
 * Fetch workers for the current user, optionally filtered by workspace
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    // Get the session
    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized worker fetch attempt`)
      return createErrorResponse('Unauthorized', 401)
    }

    const userId = session.user.id

    // Get workspaceId from query params if provided
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    // Base query to select workers
    const query = db
      .select()
      .from(worker)
      .where(workspaceId ?
        and(
          eq(worker.userId, userId),
          eq(worker.workspaceId, workspaceId)
        ) :
        eq(worker.userId, userId)
      )

    // If workspaceId is provided, verify access and filter by workspace
    if (workspaceId) {
      // Verify workspace exists
      const workspaceExists = await db
        .select({ id: workspace.id })
        .from(workspace)
        .where(eq(workspace.id, workspaceId))
        .then((rows) => rows.length > 0)

      if (!workspaceExists) {
        logger.warn(`[${requestId}] Attempt to fetch workers from non-existent workspace: ${workspaceId}`)
        return createErrorResponse('Workspace not found', 404)
      }

      // Check user's permission for the workspace
      const permission = await getUserEntityPermissions(userId, 'workspace', workspaceId)
      if (!permission) {
        logger.warn(`[${requestId}] User ${userId} attempted to fetch workers from workspace ${workspaceId} without permission`)
        return createErrorResponse('Access denied to this workspace', 403)
      }
    }

    // Execute the query
    const workers = await query

    logger.info(`[${requestId}] Successfully fetched ${workers.length} workers for user ${userId}${workspaceId ? ` in workspace ${workspaceId}` : ''}`)

    return createSuccessResponse({ data: workers })
  } catch (error) {
    logger.error(`[${requestId}] Error fetching workers:`, error)
    return createErrorResponse('Failed to fetch workers', 500)
  }
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    // Verify authentication
    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized worker creation attempt`)
      return createErrorResponse('Unauthorized', 401)
    }

    const userId = session.user.id

    // Parse and validate request body
    const body = await req.json()
    const validation = CreateWorkerSchema.safeParse(body)

    if (!validation.success) {
      logger.warn(`[${requestId}] Invalid worker creation request:`, validation.error)
      return createErrorResponse('Invalid request data', 400)
    }

    const { name, description, color, workspaceId, marketplaceData } = validation.data

    // If workspaceId is provided, verify workspace exists and user has access
    if (workspaceId) {
      // Check workspace exists
      const workspaceExists = await db
        .select({ id: workspace.id })
        .from(workspace)
        .where(eq(workspace.id, workspaceId))
        .then((rows) => rows.length > 0)

      if (!workspaceExists) {
        logger.warn(
          `[${requestId}] Attempt to create worker in non-existent workspace: ${workspaceId}`
        )
        return createErrorResponse('Workspace not found', 404, 'WORKSPACE_NOT_FOUND')
      }

      // Verify user is a member of the workspace
      const userRole = await verifyWorkspaceMembership(userId, workspaceId)
      if (!userRole) {
        logger.warn(
          `[${requestId}] User ${userId} attempted to create worker in workspace ${workspaceId} without membership`
        )
        return createErrorResponse(
          'Access denied to this workspace',
          403,
          'WORKSPACE_ACCESS_DENIED'
        )
      }
    }

    const workerId = crypto.randomUUID()
    const now = new Date()

    // Create worker in database
    await db.insert(worker).values({
      id: workerId,
      userId,
      workspaceId: workspaceId || null,
      name,
      description: description || '',
      color,
      marketplaceData: marketplaceData || null,
      createdBy: userId,
      lastSynced: now,
      createdAt: now,
      updatedAt: now,
    })

    // Create a default "Start" block for the new worker
    const startBlockId = crypto.randomUUID()
    const startBlock = {
      id: startBlockId,
      workerId: workerId,
      type: 'starter',
      name: 'Start',
      positionX: (100).toString(),
      positionY: (100).toString(),
      enabled: true,
      horizontalHandles: false,
      isWide: false,
      height: (0).toString(),
      subBlocks: {
        startWorker: { id: 'startWorker', type: 'dropdown', value: 'manual' },
        webhookPath: { id: 'webhookPath', type: 'short-input', value: '' },
        webhookSecret: { id: 'webhookSecret', type: 'short-input', value: '' },
        scheduleType: { id: 'scheduleType', type: 'dropdown', value: 'daily' },
        minutesInterval: { id: 'minutesInterval', type: 'short-input', value: '' },
        minutesStartingAt: { id: 'minutesStartingAt', type: 'short-input', value: '' },
        hourlyMinute: { id: 'hourlyMinute', type: 'short-input', value: '' },
        dailyTime: { id: 'dailyTime', type: 'short-input', value: '' },
        weeklyDay: { id: 'weeklyDay', type: 'dropdown', value: 'MON' },
        weeklyDayTime: { id: 'weeklyDayTime', type: 'short-input', value: '' },
        monthlyDay: { id: 'monthlyDay', type: 'short-input', value: '' },
        monthlyTime: { id: 'monthlyTime', type: 'short-input', value: '' },
        cronExpression: { id: 'cronExpression', type: 'short-input', value: '' },
        timezone: { id: 'timezone', type: 'dropdown', value: 'UTC' },
      },
      outputs: { response: { type: { input: 'any' } } },
      data: {},
      parentId: null,
      extent: null,
    }

    await db.insert(workerBlocks).values([startBlock])

    logger.info(
      `[${requestId}] Created worker ${workerId} for user ${userId} in workspace ${workspaceId || 'none'}`
    )

    return createSuccessResponse({
      id: workerId,
      userId,
      workspaceId,
      name,
      description,
      color,
      marketplaceData,
      createdAt: now,
      updatedAt: now,
      lastSynced: now,
      isDeployed: false,
      deployedAt: null,
      runCount: 0,
      lastRunAt: null,
    })
  } catch (error) {
    const errorId = crypto.randomUUID().slice(0, 8)
    logger.error(`[${errorId}] Error creating worker:`, error)
    return createErrorResponse(
      `Internal Server Error. Please contact support with this ID: ${errorId}`,
      500
    )
  }
}
