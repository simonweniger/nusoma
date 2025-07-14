import { db } from '@nusoma/database'
import * as schema from '@nusoma/database/schema'
import { eq } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { createLogger } from '@/lib/logger/console-logger'
import { createErrorResponse, createSuccessResponse } from '@/app/api/workers/utils'

const logger = createLogger('PublicWorkerAPI')

// Cache response for performance
export const revalidate = 3600

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    const { id } = await params

    // First, check if the worker exists and is published to the marketplace
    const marketplaceEntry = await db
      .select({
        id: schema.marketplace.id,
        workerId: schema.marketplace.workerId,
        state: schema.marketplace.state,
        name: schema.marketplace.name,
        description: schema.marketplace.description,
        authorId: schema.marketplace.authorId,
        authorName: schema.marketplace.authorName,
      })
      .from(schema.marketplace)
      .where(eq(schema.marketplace.workerId, id))
      .limit(1)
      .then((rows) => rows[0])

    if (!marketplaceEntry) {
      // Check if worker exists but is not in marketplace
      const workerExists = await db
        .select({ id: schema.worker.id })
        .from(schema.worker)
        .where(eq(schema.worker.id, id))
        .limit(1)
        .then((rows) => rows.length > 0)

      if (!workerExists) {
        logger.warn(`[${requestId}] Worker not found: ${id}`)
        return createErrorResponse('Worker not found', 404)
      }

      logger.warn(`[${requestId}] Worker exists but is not published: ${id}`)
      return createErrorResponse('Worker is not published', 403)
    }

    logger.info(`[${requestId}] Retrieved public worker: ${id}`)

    return createSuccessResponse({
      id: marketplaceEntry.workerId,
      name: marketplaceEntry.name,
      description: marketplaceEntry.description,
      authorId: marketplaceEntry.authorId,
      authorName: marketplaceEntry.authorName,
      state: marketplaceEntry.state,
      isPublic: true,
    })
  } catch (error) {
    logger.error(`[${requestId}] Error getting public worker: ${(await params).id}`, error)
    return createErrorResponse('Failed to get public worker', 500)
  }
}
