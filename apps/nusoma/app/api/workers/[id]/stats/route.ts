import { db } from '@nusoma/database'
import { userStats, worker } from '@nusoma/database/schema'
import { eq, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger/console-logger'

const logger = createLogger('WorkerStatsAPI')

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const searchParams = request.nextUrl.searchParams
  const runs = Number.parseInt(searchParams.get('runs') || '1', 10)

  if (Number.isNaN(runs) || runs < 1 || runs > 100) {
    logger.error(`Invalid number of runs: ${runs}`)
    return NextResponse.json(
      { error: 'Invalid number of runs. Must be between 1 and 100.' },
      { status: 400 }
    )
  }

  try {
    // Get worker record
    const [workerRecord] = await db.select().from(worker).where(eq(worker.id, id)).limit(1)

    if (!workerRecord) {
      return NextResponse.json({ error: `Worker ${id} not found` }, { status: 404 })
    }

    // Update worker runCount
    try {
      await db
        .update(worker)
        .set({
          runCount: workerRecord.runCount + runs,
          lastRunAt: new Date(),
        })
        .where(eq(worker.id, id))
    } catch (error) {
      logger.error('Error updating worker runCount:', error)
      throw error
    }

    // Upsert user stats record
    try {
      // Check if record exists
      const userStatsRecords = await db
        .select()
        .from(userStats)
        .where(eq(userStats.userId, workerRecord.userId))

      if (userStatsRecords.length === 0) {
        // Create new record if none exists
        await db.insert(userStats).values({
          id: crypto.randomUUID(),
          userId: workerRecord.userId,
          totalManualExecutions: runs,
          totalApiCalls: 0,
          totalWebhookTriggers: 0,
          totalScheduledExecutions: 0,
          totalChatExecutions: 0,
          totalTokensUsed: 0,
          totalCost: '0.00',
          lastActive: new Date(),
        })
      } else {
        // Update existing record
        await db
          .update(userStats)
          .set({
            totalManualExecutions: sql`total_manual_executions + ${runs}`,
            lastActive: new Date(),
          })
          .where(eq(userStats.userId, workerRecord.userId))
      }
    } catch (error) {
      logger.error(`Error upserting userStats for userId ${workerRecord.userId}:`, error)
      // Don't rethrow - we want to continue even if this fails
    }

    return NextResponse.json({
      success: true,
      runsAdded: runs,
      newTotal: workerRecord.runCount + runs,
    })
  } catch (error) {
    logger.error('Error updating worker stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
