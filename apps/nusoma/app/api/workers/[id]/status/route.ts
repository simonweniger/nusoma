import type { NextRequest } from 'next/server'
import { createLogger } from '@/lib/logger/console-logger'
import { hasWorkerChanged } from '@/lib/workers/utils'
import { validateWorkerAccess } from '../../middleware'
import { createErrorResponse, createSuccessResponse } from '../../utils'

const logger = createLogger('WorkerStatusAPI')

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    const { id } = await params

    const validation = await validateWorkerAccess(request, id, false)
    if (validation.error) {
      logger.warn(`[${requestId}] Worker access validation failed: ${validation.error.message}`)
      return createErrorResponse(validation.error.message, validation.error.status)
    }

    // Check if the worker has meaningful changes that would require redeployment
    let needsRedeployment = false
    if (validation.worker.isDeployed && validation.worker.deployedState) {
      needsRedeployment = hasWorkerChanged(
        validation.worker.state as any,
        validation.worker.deployedState as any
      )
    }

    return createSuccessResponse({
      isDeployed: validation.worker.isDeployed,
      deployedAt: validation.worker.deployedAt,
      isPublished: validation.worker.isPublished,
      needsRedeployment,
    })
  } catch (error) {
    logger.error(`[${requestId}] Error getting status for worker: ${(await params).id}`, error)
    return createErrorResponse('Failed to get status', 500)
  }
}
