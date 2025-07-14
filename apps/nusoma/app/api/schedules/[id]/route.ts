import crypto from 'crypto'
import { db } from '@nusoma/database'
import { worker, workerSchedule } from '@nusoma/database/schema'
import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-server'
import { createLogger } from '@/lib/logger/console-logger'

const logger = createLogger('ScheduleAPI')

export const dynamic = 'force-dynamic'

/**
 * Delete a schedule
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    const { id } = await params
    logger.debug(`[${requestId}] Deleting schedule with ID: ${id}`)

    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized schedule deletion attempt`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find the schedule and check ownership
    const schedules = await db
      .select({
        schedule: workerSchedule,
        worker: {
          id: worker.id,
          userId: worker.userId,
        },
      })
      .from(workerSchedule)
      .innerJoin(worker, eq(workerSchedule.workerId, worker.id))
      .where(eq(workerSchedule.id, id))
      .limit(1)

    if (schedules.length === 0) {
      logger.warn(`[${requestId}] Schedule not found: ${id}`)
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    if (schedules[0].worker.userId !== session.user.id) {
      logger.warn(`[${requestId}] Unauthorized schedule deletion attempt for schedule: ${id}`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete the schedule
    await db.delete(workerSchedule).where(eq(workerSchedule.id, id))

    logger.info(`[${requestId}] Successfully deleted schedule: ${id}`)
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    logger.error(`[${requestId}] Error deleting schedule`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Update a schedule - can be used to reactivate a disabled schedule
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    const { id } = await params
    const scheduleId = id
    logger.debug(`[${requestId}] Updating schedule with ID: ${scheduleId}`)

    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized schedule update attempt`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    const [schedule] = await db
      .select({
        id: workerSchedule.id,
        workerId: workerSchedule.workerId,
        status: workerSchedule.status,
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
      logger.warn(`[${requestId}] User not authorized to modify this schedule: ${scheduleId}`)
      return NextResponse.json({ error: 'Not authorized to modify this schedule' }, { status: 403 })
    }

    if (action === 'reactivate' || (body.status && body.status === 'active')) {
      if (schedule.status === 'active') {
        return NextResponse.json({ message: 'Schedule is already active' }, { status: 200 })
      }

      const now = new Date()
      const nextRunAt = new Date(now.getTime() + 60 * 1000) // Schedule to run in 1 minute

      await db
        .update(workerSchedule)
        .set({
          status: 'active',
          failedCount: 0,
          updatedAt: now,
          nextRunAt,
        })
        .where(eq(workerSchedule.id, scheduleId))

      logger.info(`[${requestId}] Reactivated schedule: ${scheduleId}`)

      return NextResponse.json({
        message: 'Schedule activated successfully',
        nextRunAt,
      })
    }

    logger.warn(`[${requestId}] Unsupported update action for schedule: ${scheduleId}`)
    return NextResponse.json({ error: 'Unsupported update action' }, { status: 400 })
  } catch (error) {
    logger.error(`[${requestId}] Error updating schedule`, error)
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 })
  }
}
