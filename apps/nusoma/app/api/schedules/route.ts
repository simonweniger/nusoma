import crypto from 'crypto'
import { db } from '@nusoma/database'
import { workerSchedule } from '@nusoma/database/schema'
import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth-server'
import { createLogger } from '@/lib/logger/console-logger'
import {
  type BlockState,
  calculateNextRunTime,
  generateCronExpression,
  getScheduleTimeValues,
  getSubBlockValue,
} from '@/lib/schedules/utils'

const logger = createLogger('ScheduledAPI')

const ScheduleRequestSchema = z.object({
  workerId: z.string(),
  state: z.object({
    blocks: z.record(z.any()),
    edges: z.array(z.any()),
    loops: z.record(z.any()),
  }),
})

// Track recent requests to reduce redundant logging
const recentRequests = new Map<string, number>()
const LOGGING_THROTTLE_MS = 5000 // 5 seconds between logging for the same worker

function hasValidScheduleConfig(
  scheduleType: string | undefined,
  scheduleValues: ReturnType<typeof getScheduleTimeValues>,
  starterBlock: BlockState
): boolean {
  switch (scheduleType) {
    case 'minutes':
      return !!scheduleValues.minutesInterval
    case 'hourly':
      return scheduleValues.hourlyMinute !== undefined
    case 'daily':
      return !!scheduleValues.dailyTime[0] || !!scheduleValues.dailyTime[1]
    case 'weekly':
      return (
        !!scheduleValues.weeklyDay &&
        (!!scheduleValues.weeklyTime[0] || !!scheduleValues.weeklyTime[1])
      )
    case 'monthly':
      return (
        !!scheduleValues.monthlyDay &&
        (!!scheduleValues.monthlyTime[0] || !!scheduleValues.monthlyTime[1])
      )
    case 'custom':
      return !!getSubBlockValue(starterBlock, 'cronExpression')
    default:
      return false
  }
}

/**
 * Get schedule information for a worker
 */
export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const url = new URL(req.url)
  const workerId = url.searchParams.get('workerId')
  const mode = url.searchParams.get('mode')

  if (mode && mode !== 'schedule') {
    return NextResponse.json({ schedule: null })
  }

  try {
    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized schedule query attempt`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!workerId) {
      return NextResponse.json({ error: 'Missing workerId parameter' }, { status: 400 })
    }

    const now = Date.now()
    const lastLog = recentRequests.get(workerId) || 0
    const shouldLog = now - lastLog > LOGGING_THROTTLE_MS

    if (shouldLog) {
      logger.info(`[${requestId}] Getting schedule for worker ${workerId}`)
      recentRequests.set(workerId, now)
    }

    const schedule = await db
      .select()
      .from(workerSchedule)
      .where(eq(workerSchedule.workerId, workerId))
      .limit(1)

    const headers = new Headers()
    headers.set('Cache-Control', 'max-age=30') // Cache for 30 seconds

    if (schedule.length === 0) {
      return NextResponse.json({ schedule: null }, { headers })
    }

    const scheduleData = schedule[0]
    const isDisabled = scheduleData.status === 'disabled'
    const hasFailures = scheduleData.failedCount > 0

    return NextResponse.json(
      {
        schedule: scheduleData,
        isDisabled,
        hasFailures,
        canBeReactivated: isDisabled,
      },
      { headers }
    )
  } catch (error) {
    logger.error(`[${requestId}] Error retrieving worker schedule`, error)
    return NextResponse.json({ error: 'Failed to retrieve worker schedule' }, { status: 500 })
  }
}

/**
 * Create or update a schedule for a worker
 */
export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    const session = await getSession()
    if (!session?.user?.id) {
      logger.warn(`[${requestId}] Unauthorized schedule update attempt`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { workerId, state } = ScheduleRequestSchema.parse(body)

    logger.info(`[${requestId}] Processing schedule update for worker ${workerId}`)

    const starterBlock = Object.values(state.blocks).find(
      (block: any) => block.type === 'starter'
    ) as BlockState | undefined

    if (!starterBlock) {
      logger.warn(`[${requestId}] No starter block found in worker ${workerId}`)
      return NextResponse.json({ error: 'No starter block found in worker' }, { status: 400 })
    }

    const startWorker = getSubBlockValue(starterBlock, 'startWorker')
    const scheduleType = getSubBlockValue(starterBlock, 'scheduleType')

    const scheduleValues = getScheduleTimeValues(starterBlock)

    const hasScheduleConfig = hasValidScheduleConfig(scheduleType, scheduleValues, starterBlock)

    if (startWorker !== 'schedule' && !hasScheduleConfig) {
      logger.info(
        `[${requestId}] Removing schedule for worker ${workerId} - no valid configuration found`
      )
      await db.delete(workerSchedule).where(eq(workerSchedule.workerId, workerId))

      return NextResponse.json({ message: 'Schedule removed' })
    }

    if (startWorker !== 'schedule') {
      logger.info(`[${requestId}] Setting worker to scheduled mode based on schedule configuration`)
    }

    logger.debug(`[${requestId}] Schedule type for worker ${workerId}: ${scheduleType}`)

    let cronExpression: string | null = null
    let nextRunAt: Date | undefined
    const timezone = getSubBlockValue(starterBlock, 'timezone') || 'UTC'

    try {
      const defaultScheduleType = scheduleType || 'daily'
      const scheduleStartAt = getSubBlockValue(starterBlock, 'scheduleStartAt')
      const scheduleTime = getSubBlockValue(starterBlock, 'scheduleTime')

      logger.debug(`[${requestId}] Schedule configuration:`, {
        type: defaultScheduleType,
        timezone,
        startDate: scheduleStartAt || 'not specified',
        time: scheduleTime || 'not specified',
      })

      cronExpression = generateCronExpression(defaultScheduleType, scheduleValues)

      nextRunAt = calculateNextRunTime(defaultScheduleType, scheduleValues)

      logger.debug(
        `[${requestId}] Generated cron: ${cronExpression}, next run at: ${nextRunAt.toISOString()}`
      )
    } catch (error) {
      logger.error(`[${requestId}] Error generating schedule: ${error}`)
      return NextResponse.json({ error: 'Failed to generate schedule' }, { status: 400 })
    }

    const values = {
      id: crypto.randomUUID(),
      workerId,
      cronExpression,
      triggerType: 'schedule',
      createdAt: new Date(),
      updatedAt: new Date(),
      nextRunAt,
      timezone,
      status: 'active', // Ensure new schedules are active
      failedCount: 0, // Reset failure count for new schedules
    }

    const setValues = {
      cronExpression,
      updatedAt: new Date(),
      nextRunAt,
      timezone,
      status: 'active', // Reactivate if previously disabled
      failedCount: 0, // Reset failure count on reconfiguration
    }

    await db
      .insert(workerSchedule)
      .values(values)
      .onConflictDoUpdate({
        target: [workerSchedule.workerId],
        set: setValues,
      })

    logger.info(`[${requestId}] Schedule updated for worker ${workerId}`, {
      nextRunAt: nextRunAt?.toISOString(),
      cronExpression,
    })

    return NextResponse.json({
      message: 'Schedule updated',
      nextRunAt,
      cronExpression,
    })
  } catch (error) {
    logger.error(`[${requestId}] Error updating worker schedule`, error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Failed to update worker schedule' }, { status: 500 })
  }
}
