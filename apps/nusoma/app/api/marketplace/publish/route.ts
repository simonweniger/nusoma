import { db } from '@nusoma/database'
import { marketplace, user, worker } from '@nusoma/database/schema'
import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { getSession } from '@/lib/auth-server'
import { createLogger } from '@/lib/logger/console-logger'

// Create a logger for this module
const logger = createLogger('MarketplacePublishAPI')

// No cache
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Schema for request body
const PublishRequestSchema = z.object({
  workerId: z.string().uuid(),
  name: z.string().min(3).max(50).optional(),
  description: z.string().min(10).max(500).optional(),
  category: z.string().min(1).optional(),
  authorName: z.string().min(2).max(50).optional(),
  workerState: z.record(z.any()).optional(),
})

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    // Get the session directly in the API route
    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized marketplace publish attempt`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    try {
      // Parse request body
      const body = await request.json()
      const { workerId, name, description, category, authorName, workerState } =
        PublishRequestSchema.parse(body)

      // Check if the worker belongs to the user
      const userWorker = await db
        .select({
          id: worker.id,
          name: worker.name,
          description: worker.description,
        })
        .from(worker)
        .where(eq(worker.id, workerId))
        .limit(1)

      if (!userWorker.length || userWorker[0].id !== workerId) {
        logger.warn(
          `[${requestId}] User ${userId} attempted to publish worker they don't own: ${workerId}`
        )
        return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
      }

      // Get the user's name for attribution
      const userData = await db
        .select({ name: user.name })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1)

      if (!userData.length) {
        logger.error(`[${requestId}] User data not found for ID: ${userId}`)
        return NextResponse.json({ error: 'User data not found' }, { status: 500 })
      }

      // Verify we have the worker state
      if (!workerState) {
        logger.error(`[${requestId}] No worker state provided for ID: ${workerId}`)
        return NextResponse.json({ error: 'Worker state is required' }, { status: 400 })
      }

      // Check if this worker is already published
      const existingPublication = await db
        .select({ id: marketplace.id })
        .from(marketplace)
        .where(eq(marketplace.workerId, workerId))
        .limit(1)

      let result
      const marketplaceId = existingPublication.length ? existingPublication[0].id : uuidv4()

      // Prepare the marketplace entry
      const marketplaceEntry = {
        id: marketplaceId,
        workerId,
        state: workerState,
        name: name || userWorker[0].name,
        description: description || userWorker[0].description || '',
        authorId: userId,
        authorName: authorName || userData[0].name,
        category: category || null,
        updatedAt: new Date(),
      }

      if (existingPublication.length) {
        // Update existing entry
        result = await db
          .update(marketplace)
          .set(marketplaceEntry)
          .where(eq(marketplace.id, marketplaceId))
          .returning()
      } else {
        // Create new entry with createdAt
        result = await db
          .insert(marketplace)
          .values({
            ...marketplaceEntry,
            createdAt: new Date(),
            views: 0,
          })
          .returning()
      }

      logger.info(`[${requestId}] Successfully published worker to marketplace`, {
        workerId,
        marketplaceId,
        userId,
      })

      return NextResponse.json({
        message: 'Worker published successfully',
        data: {
          id: result[0].id,
          workerId: result[0].workerId,
          name: result[0].name,
        },
      })
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        logger.warn(`[${requestId}] Invalid marketplace publish request parameters`, {
          errors: validationError.errors,
        })
        return NextResponse.json(
          {
            error: 'Invalid request parameters',
            details: validationError.errors,
          },
          { status: 400 }
        )
      }
      throw validationError
    }
  } catch (error: any) {
    logger.error(`[${requestId}] Marketplace publish error`, error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
