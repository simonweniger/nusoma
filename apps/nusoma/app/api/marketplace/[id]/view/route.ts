import { db } from '@nusoma/database'
import * as schema from '@nusoma/database/schema'
import { eq, sql } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { createLogger } from '@/lib/logger/console-logger'
import { createErrorResponse, createSuccessResponse } from '@/app/api/workers/utils'

const logger = createLogger('MarketplaceViewAPI')

/**
 * POST handler for incrementing the view count when a worker card is clicked
 * This endpoint is called from the WorkerCard component's onClick handler
 *
 * The ID parameter is the marketplace entry ID, not the worker ID
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    const { id } = await params

    // Find the marketplace entry for this marketplace ID
    const marketplaceEntry = await db
      .select({
        id: schema.marketplace.id,
      })
      .from(schema.marketplace)
      .where(eq(schema.marketplace.id, id))
      .limit(1)
      .then((rows) => rows[0])

    if (!marketplaceEntry) {
      logger.warn(`[${requestId}] No marketplace entry found with ID: ${id}`)
      return createErrorResponse('Marketplace entry not found', 404)
    }

    // Increment the view count for this worker
    await db
      .update(schema.marketplace)
      .set({
        views: sql`${schema.marketplace.views} + 1`,
      })
      .where(eq(schema.marketplace.id, id))

    logger.info(`[${requestId}] Incremented view count for marketplace entry: ${id}`)

    return createSuccessResponse({
      success: true,
    })
  } catch (error) {
    logger.error(
      `[${requestId}] Error incrementing view count for marketplace entry: ${(await params).id}`,
      error
    )
    return createErrorResponse('Failed to track view', 500)
  }
}
