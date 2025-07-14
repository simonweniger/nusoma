import { db } from '@nusoma/database'
import { worker, workerSchedule } from '@nusoma/database/schema'
import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-server'
import { createLogger } from '@/lib/logger/console-logger'

const logger = createLogger('ScheduleStatusAPI')

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const { id } = await params
  const scheduleId = id

  try {
    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized schedule status request`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [schedule] = await db
      .select({
        id: workerSchedule.id,
        workerId: workerSchedule.workerId,
        status: workerSchedule.status,
        failedCount: workerSchedule.failedCount,
        lastRanAt: workerSchedule.lastRanAt,
        lastFailedAt: workerSchedule.lastFailedAt,
        nextRunAt: workerSchedule.nextRunAt,
      })
      .from(workerSchedule)
      .where(eq(workerSchedule.id, scheduleId))
      .limit(1)

    if (!schedule) {
      logger.warn(`[${requestId}] Schedule not found: ${scheduleId}`)
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    const [workerRecord] = await db
      .select({ userId: worker.userId })
      .from(worker)
      .where(eq(worker.id, schedule.workerId))
      .limit(1)

    if (!workerRecord) {
      logger.warn(`[${requestId}] Worker not found for schedule: ${scheduleId}`)
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    if (workerRecord.userId !== session.user.id) {
      logger.warn(`[${requestId}] User not authorized to view this schedule: ${scheduleId}`)
      return NextResponse.json({ error: 'Not authorized to view this schedule' }, { status: 403 })
    }

    return NextResponse.json({
      status: schedule.status,
      failedCount: schedule.failedCount,
      lastRanAt: schedule.lastRanAt,
      lastFailedAt: schedule.lastFailedAt,
      nextRunAt: schedule.nextRunAt,
      isDisabled: schedule.status === 'disabled',
    })
  } catch (error) {
    logger.error(`[${requestId}] Error retrieving schedule status: ${scheduleId}`, error)
    return NextResponse.json({ error: 'Failed to retrieve schedule status' }, { status: 500 })
  }
}
