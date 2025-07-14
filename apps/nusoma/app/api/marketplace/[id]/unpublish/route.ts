import { db } from '@nusoma/database'
import * as schema from '@nusoma/database/schema'
import { eq } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth-server'
import { createLogger } from '@/lib/logger/console-logger'
import { createErrorResponse, createSuccessResponse } from '@/app/api/workers/utils'

const logger = createLogger('MarketplaceUnpublishAPI')

/**
 * API endpoint to unpublish a worker from the marketplace by its marketplace ID
 *
 * Security:
 * - Requires authentication
 * - Validates that the current user is the author of the marketplace entry
 * - Only allows the owner to unpublish
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    const { id } = await params

    // Get the session first for authorization
    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized unpublish attempt for marketplace ID: ${id}`)
      return createErrorResponse('Unauthorized', 401)
    }

    const userId = session.user.id

    // Get the marketplace entry using the marketplace ID
    const marketplaceEntry = await db
      .select({
        id: schema.marketplace.id,
        workerId: schema.marketplace.workerId,
        authorId: schema.marketplace.authorId,
        name: schema.marketplace.name,
      })
      .from(schema.marketplace)
      .where(eq(schema.marketplace.id, id))
      .limit(1)
      .then((rows) => rows[0])

    if (!marketplaceEntry) {
      logger.warn(`[${requestId}] No marketplace entry found with ID: ${id}`)
      return createErrorResponse('Marketplace entry not found', 404)
    }

    // Check if the user is the author of the marketplace entry
    if (marketplaceEntry.authorId !== userId) {
      logger.warn(
        `[${requestId}] User ${userId} tried to unpublish marketplace entry they don't own: ${id}, author: ${marketplaceEntry.authorId}`
      )
      return createErrorResponse('You do not have permission to unpublish this worker', 403)
    }

    const workerId = marketplaceEntry.workerId

    // Verify the worker exists and belongs to the user
    const worker = await db
      .select({
        id: schema.worker.id,
        userId: schema.worker.userId,
      })
      .from(schema.worker)
      .where(eq(schema.worker.id, workerId))
      .limit(1)
      .then((rows) => rows[0])

    if (!worker) {
      logger.warn(`[${requestId}] Associated worker not found: ${workerId}`)
      // We'll still delete the marketplace entry even if the worker is missing
    } else if (worker.userId !== userId) {
      logger.warn(
        `[${requestId}] Worker ${workerId} belongs to user ${worker.userId}, not current user ${userId}`
      )
      return createErrorResponse('You do not have permission to unpublish this worker', 403)
    }

    try {
      // Delete the marketplace entry - this is the primary action
      await db.delete(schema.marketplace).where(eq(schema.marketplace.id, id))

      // Update the worker to mark it as unpublished if it exists
      if (worker) {
        await db
          .update(schema.worker)
          .set({ isPublished: false })
          .where(eq(schema.worker.id, workerId))
      }

      logger.info(
        `[${requestId}] Worker "${marketplaceEntry.name}" unpublished from marketplace: ID=${id}, workerId=${workerId}`
      )

      return createSuccessResponse({
        success: true,
        message: 'Worker successfully unpublished from marketplace',
      })
    } catch (dbError) {
      logger.error(`[${requestId}] Database error unpublishing marketplace entry:`, dbError)
      return createErrorResponse('Failed to unpublish worker due to a database error', 500)
    }
  } catch (error) {
    logger.error(`[${requestId}] Error unpublishing marketplace entry: ${(await params).id}`, error)
    return createErrorResponse('Failed to unpublish worker', 500)
  }
}
