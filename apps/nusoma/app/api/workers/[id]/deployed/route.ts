import { db } from '@nusoma/database'
import { worker } from '@nusoma/database/schema'
import { eq } from 'drizzle-orm'
import type { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger/console-logger'
import { validateWorkerAccess } from '../../middleware'
import { createErrorResponse, createSuccessResponse } from '../../utils'

const logger = createLogger('WorkerDeployedStateAPI')

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Helper function to add Cache-Control headers to NextResponse
function addNoCacheHeaders(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  return response
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const { id } = await params

  try {
    logger.debug(`[${requestId}] Fetching deployed state for worker: ${id}`)
    const validation = await validateWorkerAccess(request, id, false)

    if (validation.error) {
      logger.warn(`[${requestId}] Failed to fetch deployed state: ${validation.error.message}`)
      const response = createErrorResponse(validation.error.message, validation.error.status)
      return addNoCacheHeaders(response)
    }

    // Fetch the worker's deployed state
    const result = await db
      .select({
        deployedState: worker.deployedState,
        isDeployed: worker.isDeployed,
      })
      .from(worker)
      .where(eq(worker.id, id))
      .limit(1)

    if (result.length === 0) {
      logger.warn(`[${requestId}] Worker not found: ${id}`)
      const response = createErrorResponse('Worker not found', 404)
      return addNoCacheHeaders(response)
    }

    const workerData = result[0]

    // If the worker is not deployed, return appropriate response
    if (!workerData.isDeployed || !workerData.deployedState) {
      const response = createSuccessResponse({
        deployedState: null,
        message: 'Worker is not deployed or has no deployed state',
      })
      return addNoCacheHeaders(response)
    }

    const response = createSuccessResponse({
      deployedState: workerData.deployedState,
    })
    return addNoCacheHeaders(response)
  } catch (error: any) {
    logger.error(`[${requestId}] Error fetching deployed state: ${id}`, error)
    const response = createErrorResponse(error.message || 'Failed to fetch deployed state', 500)
    return addNoCacheHeaders(response)
  }
}
