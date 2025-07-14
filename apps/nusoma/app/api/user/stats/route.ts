import { db } from '@nusoma/database'
import { userStats, worker } from '@nusoma/database/schema'
import { eq, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-server'
import { createLogger } from '@/lib/logger/console-logger'

const logger = createLogger('UserStatsAPI')

/**
 * GET endpoint to retrieve user statistics including the count of workers
 */
export async function GET(_request: NextRequest) {
  try {
    // Get the user session
    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn('Unauthorized user stats access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get worker count for user
    const [workerCountResult] = await db
      .select({ count: sql`count(*)::int` })
      .from(worker)
      .where(eq(worker.userId, userId))

    const workerCount = workerCountResult?.count || 0

    // Get user stats record
    const userStatsRecords = await db.select().from(userStats).where(eq(userStats.userId, userId))

    // If no stats record exists, create one
    if (userStatsRecords.length === 0) {
      const newStats = {
        id: crypto.randomUUID(),
        userId,
        totalManualExecutions: 0,
        totalApiCalls: 0,
        totalWebhookTriggers: 0,
        totalScheduledExecutions: 0,
        totalChatExecutions: 0,
        totalTokensUsed: 0,
        totalCost: '0.00',
        lastActive: new Date(),
      }

      await db.insert(userStats).values(newStats)

      // Return the newly created stats with worker count
      return NextResponse.json({
        ...newStats,
        workerCount,
      })
    }

    // Return stats with worker count
    const stats = userStatsRecords[0]
    return NextResponse.json({
      ...stats,
      workerCount,
    })
  } catch (error) {
    logger.error('Error fetching user stats:', error)
    return NextResponse.json({ error: 'Failed to fetch user statistics' }, { status: 500 })
  }
}
