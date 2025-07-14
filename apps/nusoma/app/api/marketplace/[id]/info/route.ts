import { db } from '@nusoma/database'
import * as schema from '@nusoma/database/schema'
import { eq } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { createLogger } from '@/lib/logger/console-logger'
import { validateWorkerAccess } from '@/app/api/workers/middleware'
import { createErrorResponse, createSuccessResponse } from '@/app/api/workers/utils'

const logger = createLogger('MarketplaceInfoAPI')

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    const { id } = await params

    // Validate access to the worker
    const validation = await validateWorkerAccess(request, id, false)
    if (validation.error) {
      logger.warn(`[${requestId}] Worker access validation failed: ${validation.error.message}`)
      return createErrorResponse(validation.error.message, validation.error.status)
    }

    // Fetch marketplace data for the worker
    const marketplaceEntry = await db
      .select()
      .from(schema.marketplace)
      .where(eq(schema.marketplace.workerId, id))
      .limit(1)
      .then((rows) => rows[0])

    if (!marketplaceEntry) {
      logger.warn(`[${requestId}] No marketplace entry found for worker: ${id}`)
      return createErrorResponse('Worker is not published to marketplace', 404)
    }

    logger.info(`[${requestId}] Retrieved marketplace info for worker: ${id}`)

    return createSuccessResponse({
      id: marketplaceEntry.id,
      name: marketplaceEntry.name,
      description: marketplaceEntry.description,
      category: marketplaceEntry.category,
      authorName: marketplaceEntry.authorName,
      views: marketplaceEntry.views,
      createdAt: marketplaceEntry.createdAt,
      updatedAt: marketplaceEntry.updatedAt,
    })
  } catch (error) {
    logger.error(
      `[${requestId}] Error getting marketplace info for worker: ${(await params).id}`,
      error
    )
    return createErrorResponse('Failed to get marketplace information', 500)
  }
}
