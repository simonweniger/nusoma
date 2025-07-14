import { db } from '@nusoma/database'
import { worker } from '@nusoma/database/schema'
import type { Variable } from '@nusoma/types/variables'
import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth-server'
import { createLogger } from '@/lib/logger/console-logger'
import { getUserEntityPermissions } from '@/lib/permissions/utils'

const logger = createLogger('WorkerVariablesAPI')

const VariablesSchema = z.object({
  variables: z.array(
    z.object({
      id: z.string(),
      workerId: z.string(),
      name: z.string(),
      type: z.enum(['string', 'number', 'boolean', 'object', 'array', 'plain']),
      value: z.union([z.string(), z.number(), z.boolean(), z.record(z.any()), z.array(z.any())]),
    })
  ),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const workerId = (await params).id

  try {
    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized worker variables update attempt`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the worker record
    const workerRecord = await db.select().from(worker).where(eq(worker.id, workerId)).limit(1)

    if (!workerRecord.length) {
      logger.warn(`[${requestId}] Worker not found: ${workerId}`)
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    const workerData = workerRecord[0]
    const workspaceId = workerData.workspaceId

    // Check authorization - either the user owns the worker or has workspace permissions
    let isAuthorized = workerData.userId === session.user.id

    // If not authorized by ownership and the worker belongs to a workspace, check workspace permissions
    if (!isAuthorized && workspaceId) {
      const userPermission = await getUserEntityPermissions(
        session.user.id,
        'workspace',
        workspaceId
      )
      isAuthorized = userPermission !== null
    }

    if (!isAuthorized) {
      logger.warn(
        `[${requestId}] User ${session.user.id} attempted to update variables for worker ${workerId} without permission`
      )
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    try {
      const { variables } = VariablesSchema.parse(body)

      // Format variables for storage
      const variablesRecord: Record<string, Variable> = {}
      variables.forEach((variable) => {
        variablesRecord[variable.id] = variable
      })

      // Get existing variables to merge with the incoming ones
      const existingVariables = (workerRecord[0].variables as Record<string, Variable>) || {}

      // Create a timestamp based on the current request

      // Merge variables: Keep existing ones and update/add new ones
      // This prevents variables from being deleted during race conditions
      const mergedVariables = {
        ...existingVariables,
        ...variablesRecord,
      }

      // Update worker with variables
      await db
        .update(worker)
        .set({
          variables: mergedVariables,
          updatedAt: new Date(),
        })
        .where(eq(worker.id, workerId))

      return NextResponse.json({ success: true })
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        logger.warn(`[${requestId}] Invalid worker variables data`, {
          errors: validationError.errors,
        })
        return NextResponse.json(
          { error: 'Invalid request data', details: validationError.errors },
          { status: 400 }
        )
      }
      throw validationError
    }
  } catch (error) {
    logger.error(`[${requestId}] Error updating worker variables`, error)
    return NextResponse.json({ error: 'Failed to update worker variables' }, { status: 500 })
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const workerId = (await params).id

  try {
    // Get the session directly in the API route
    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized worker variables access attempt`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the worker record
    const workerRecord = await db.select().from(worker).where(eq(worker.id, workerId)).limit(1)

    if (!workerRecord.length) {
      logger.warn(`[${requestId}] Worker not found: ${workerId}`)
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    const workerData = workerRecord[0]
    const workspaceId = workerData.workspaceId

    // Check authorization - either the user owns the worker or has workspace permissions
    let isAuthorized = workerData.userId === session.user.id

    // If not authorized by ownership and the worker belongs to a workspace, check workspace permissions
    if (!isAuthorized && workspaceId) {
      const userPermission = await getUserEntityPermissions(
        session.user.id,
        'workspace',
        workspaceId
      )
      isAuthorized = userPermission !== null
    }

    if (!isAuthorized) {
      logger.warn(
        `[${requestId}] User ${session.user.id} attempted to access variables for worker ${workerId} without permission`
      )
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Return variables if they exist
    const variables = (workerData.variables as Record<string, Variable>) || {}

    // Add cache headers to prevent frequent reloading
    const variableHash = JSON.stringify(variables).length
    const headers = new Headers({
      'Cache-Control': 'max-age=30, stale-while-revalidate=300', // Cache for 30 seconds, stale for 5 min
      ETag: `"variables-${workerId}-${variableHash}"`,
    })

    return NextResponse.json(
      { data: variables },
      {
        status: 200,
        headers,
      }
    )
  } catch (error: any) {
    logger.error(`[${requestId}] Worker variables fetch error`, error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const workerId = (await params).id

  try {
    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized worker variables update attempt`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the worker record
    const workerRecord = await db.select().from(worker).where(eq(worker.id, workerId)).limit(1)

    if (!workerRecord.length) {
      logger.warn(`[${requestId}] Worker not found: ${workerId}`)
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    const workerData = workerRecord[0]
    const workspaceId = workerData.workspaceId

    // Check authorization - either the user owns the worker or has workspace permissions
    let isAuthorized = workerData.userId === session.user.id

    // If not authorized by ownership and the worker belongs to a workspace, check workspace permissions
    if (!isAuthorized && workspaceId) {
      const userPermission = await getUserEntityPermissions(
        session.user.id,
        'workspace',
        workspaceId
      )
      isAuthorized = userPermission !== null
    }

    if (!isAuthorized) {
      logger.warn(
        `[${requestId}] User ${session.user.id} attempted to update variables for worker ${workerId} without permission`
      )
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    try {
      const { variables } = VariablesSchema.parse(body)

      // Format variables for storage
      const variablesRecord: Record<string, Variable> = {}
      variables.forEach((variable) => {
        variablesRecord[variable.id] = variable
      })

      // Get existing variables to merge with the incoming ones
      const existingVariables = (workerRecord[0].variables as Record<string, Variable>) || {}

      // Create a timestamp based on the current request

      // Merge variables: Keep existing ones and update/add new ones
      // This prevents variables from being deleted during race conditions
      const mergedVariables = {
        ...existingVariables,
        ...variablesRecord,
      }

      // Update worker with variables
      await db
        .update(worker)
        .set({
          variables: mergedVariables,
          updatedAt: new Date(),
        })
        .where(eq(worker.id, workerId))

      return NextResponse.json({ success: true })
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        logger.warn(`[${requestId}] Invalid worker variables data`, {
          errors: validationError.errors,
        })
        return NextResponse.json(
          { error: 'Invalid request data', details: validationError.errors },
          { status: 400 }
        )
      }
      throw validationError
    }
  } catch (error) {
    logger.error(`[${requestId}] Error updating worker variables`, error)
    return NextResponse.json({ error: 'Failed to update worker variables' }, { status: 500 })
  }
}
