import { db } from '@nusoma/database'
import { environment, userStats, worker, workerSchedule } from '@nusoma/database/schema'
import { Cron } from 'croner'
import { and, eq, lte, not, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { createLogger } from '@/lib/logger/console-logger'
import { persistExecutionError, persistExecutionLogs } from '@/lib/logger/execution-logger'
import { buildTraceSpans } from '@/lib/logger/trace-spans'
import {
  type BlockState,
  calculateNextRunTime as calculateNextTime,
  getScheduleTimeValues,
  getSubBlockValue,
} from '@/lib/schedules/utils'
import { checkServerSideUsageLimits } from '@/lib/usage-monitor'
import { decryptSecret } from '@/lib/utils'
import { loadWorkerFromNormalizedTables } from '@/lib/workers/db-helpers'
import { updateWorkerRunCounts } from '@/lib/workers/utils'
import { Executor } from '@/executor'
import { Serializer } from '@/serializer'
import { mergeSubblockState } from '@/stores/workers/server-utils'

// Add dynamic export to prevent caching
export const dynamic = 'force-dynamic'

const logger = createLogger('ScheduledExecuteAPI')

// Maximum number of consecutive failures before disabling a schedule
const MAX_CONSECUTIVE_FAILURES = 3

/**
 * Calculate the next run time for a schedule
 * This is a wrapper around the utility function in schedule-utils.ts
 */
function calculateNextRunTime(
  schedule: typeof workerSchedule.$inferSelect,
  blocks: Record<string, BlockState>
): Date {
  const starterBlock = Object.values(blocks).find((block) => block.type === 'starter')
  if (!starterBlock) throw new Error('No starter block found')
  const scheduleType = getSubBlockValue(starterBlock, 'scheduleType')
  const scheduleValues = getScheduleTimeValues(starterBlock)

  if (schedule.cronExpression) {
    const cron = new Cron(schedule.cronExpression)
    const nextDate = cron.nextRun()
    if (!nextDate) throw new Error('Invalid cron expression or no future occurrences')
    return nextDate
  }

  const lastRanAt = schedule.lastRanAt ? new Date(schedule.lastRanAt) : null
  return calculateNextTime(scheduleType, scheduleValues, lastRanAt)
}

const EnvVarsSchema = z.record(z.string())

const runningExecutions = new Set<string>()

export async function GET(req: NextRequest) {
  logger.info(`Scheduled execution triggered at ${new Date().toISOString()}`)
  const requestId = crypto.randomUUID().slice(0, 8)
  const now = new Date()

  let dueSchedules: (typeof workerSchedule.$inferSelect)[] = []

  try {
    try {
      dueSchedules = await db
        .select()
        .from(workerSchedule)
        .where(and(lte(workerSchedule.nextRunAt, now), not(eq(workerSchedule.status, 'disabled'))))
        .limit(10)

      logger.debug(`[${requestId}] Successfully queried schedules: ${dueSchedules.length} found`)
    } catch (queryError) {
      logger.error(`[${requestId}] Error in schedule query:`, queryError)
      throw queryError
    }

    logger.info(`[${requestId}] Processing ${dueSchedules.length} due scheduled workers`)

    for (const schedule of dueSchedules) {
      const executionId = uuidv4()

      try {
        if (runningExecutions.has(schedule.workerId)) {
          logger.debug(`[${requestId}] Skipping worker ${schedule.workerId} - already running`)
          continue
        }

        runningExecutions.add(schedule.workerId)
        logger.debug(`[${requestId}] Starting execution of worker ${schedule.workerId}`)

        const [workerRecord] = await db
          .select()
          .from(worker)
          .where(eq(worker.id, schedule.workerId))
          .limit(1)

        if (!workerRecord) {
          logger.warn(`[${requestId}] Worker ${schedule.workerId} not found`)
          runningExecutions.delete(schedule.workerId)
          continue
        }

        const usageCheck = await checkServerSideUsageLimits(workerRecord.userId)
        if (usageCheck.isExceeded) {
          logger.warn(
            `[${requestId}] User ${workerRecord.userId} has exceeded usage limits. Skipping scheduled execution.`,
            {
              currentUsage: usageCheck.currentUsage,
              limit: usageCheck.limit,
              workerId: schedule.workerId,
            }
          )

          await persistExecutionError(
            schedule.workerId,
            executionId,
            new Error(
              usageCheck.message ||
              'Usage limit exceeded. Please upgrade your plan to continue running scheduled workers.'
            ),
            'schedule'
          )

          const retryDelay = 24 * 60 * 60 * 1000 // 24 hour delay for exceeded limits
          const nextRetryAt = new Date(now.getTime() + retryDelay)

          try {
            await db
              .update(workerSchedule)
              .set({
                updatedAt: now,
                nextRunAt: nextRetryAt,
              })
              .where(eq(workerSchedule.id, schedule.id))

            logger.debug(`[${requestId}] Updated next retry time due to usage limits`)
          } catch (updateError) {
            logger.error(`[${requestId}] Error updating schedule for usage limits:`, updateError)
          }

          runningExecutions.delete(schedule.workerId)
          continue
        }

        // Load worker data from normalized tables (no fallback to deprecated state column)
        logger.debug(`[${requestId}] Loading worker ${schedule.workerId} from normalized tables`)
        const normalizedData = await loadWorkerFromNormalizedTables(schedule.workerId)

        if (!normalizedData) {
          logger.error(
            `[${requestId}] No normalized data found for scheduled worker ${schedule.workerId}`
          )
          throw new Error(`Worker data not found in normalized tables for ${schedule.workerId}`)
        }

        // Use normalized data only
        const blocks = normalizedData.blocks
        const edges = normalizedData.edges
        const loops = normalizedData.loops
        const parallels = normalizedData.parallels
        logger.info(
          `[${requestId}] Loaded scheduled worker ${schedule.workerId} from normalized tables`
        )

        const mergedStates = mergeSubblockState(blocks)

        // Retrieve environment variables for this user (if any).
        const [userEnv] = await db
          .select()
          .from(environment)
          .where(eq(environment.userId, workerRecord.userId))
          .limit(1)

        if (!userEnv) {
          logger.debug(
            `[${requestId}] No environment record found for user ${workerRecord.userId}. Proceeding with empty variables.`
          )
        }

        const variables = EnvVarsSchema.parse(userEnv?.variables ?? {})

        const currentBlockStates = await Object.entries(mergedStates).reduce(
          async (accPromise, [id, block]) => {
            const acc = await accPromise
            acc[id] = await Object.entries(block.subBlocks).reduce(
              async (subAccPromise, [key, subBlock]) => {
                const subAcc = await subAccPromise
                let value = subBlock.value

                if (typeof value === 'string' && value.includes('{{') && value.includes('}}')) {
                  const matches = value.match(/{{([^}]+)}}/g)
                  if (matches) {
                    for (const match of matches) {
                      const varName = match.slice(2, -2)
                      const encryptedValue = variables[varName]
                      if (!encryptedValue) {
                        throw new Error(`Environment variable "${varName}" was not found`)
                      }

                      try {
                        const { decrypted } = await decryptSecret(encryptedValue)
                        value = (value as string).replace(match, decrypted)
                      } catch (error: any) {
                        logger.error(
                          `[${requestId}] Error decrypting value for variable "${varName}"`,
                          error
                        )
                        throw new Error(
                          `Failed to decrypt environment variable "${varName}": ${error.message}`
                        )
                      }
                    }
                  }
                }

                subAcc[key] = value
                return subAcc
              },
              Promise.resolve({} as Record<string, any>)
            )
            return acc
          },
          Promise.resolve({} as Record<string, Record<string, any>>)
        )

        const decryptedEnvVars: Record<string, string> = {}
        for (const [key, encryptedValue] of Object.entries(variables)) {
          try {
            const { decrypted } = await decryptSecret(encryptedValue)
            decryptedEnvVars[key] = decrypted
          } catch (error: any) {
            logger.error(`[${requestId}] Failed to decrypt environment variable "${key}"`, error)
            throw new Error(`Failed to decrypt environment variable "${key}": ${error.message}`)
          }
        }

        const serializedWorker = new Serializer().serializeWorker(
          mergedStates,
          edges,
          loops,
          parallels
        )

        const input = {
          workerId: schedule.workerId,
          _context: {
            workerId: schedule.workerId,
          },
        }

        const processedBlockStates = Object.entries(currentBlockStates).reduce(
          (acc, [blockId, blockState]) => {
            if (blockState.responseFormat && typeof blockState.responseFormat === 'string') {
              try {
                logger.debug(`[${requestId}] Parsing responseFormat for block ${blockId}`)
                const parsedResponseFormat = JSON.parse(blockState.responseFormat)

                acc[blockId] = {
                  ...blockState,
                  responseFormat: parsedResponseFormat,
                }
              } catch (error) {
                logger.warn(
                  `[${requestId}] Failed to parse responseFormat for block ${blockId}`,
                  error
                )
                acc[blockId] = blockState
              }
            } else {
              acc[blockId] = blockState
            }
            return acc
          },
          {} as Record<string, Record<string, any>>
        )

        logger.info(`[${requestId}] Executing worker ${schedule.workerId}`)

        let workerVariables = {}
        if (workerRecord.variables) {
          try {
            if (typeof workerRecord.variables === 'string') {
              workerVariables = JSON.parse(workerRecord.variables)
            } else {
              workerVariables = workerRecord.variables
            }
            logger.debug(
              `[${requestId}] Loaded ${Object.keys(workerVariables).length} worker variables for: ${schedule.workerId}`
            )
          } catch (error) {
            logger.error(
              `[${requestId}] Failed to parse worker variables: ${schedule.workerId}`,
              error
            )
          }
        } else {
          logger.debug(`[${requestId}] No worker variables found for: ${schedule.workerId}`)
        }

        const executor = new Executor(
          serializedWorker,
          processedBlockStates,
          decryptedEnvVars,
          input,
          workerVariables
        )
        const result = await executor.execute(schedule.workerId)

        const executionResult =
          'stream' in result && 'execution' in result ? result.execution : result

        logger.info(`[${requestId}] Worker execution completed: ${schedule.workerId}`, {
          success: executionResult.success,
          executionTime: executionResult.metadata?.duration,
        })

        if (executionResult.success) {
          await updateWorkerRunCounts(schedule.workerId)

          try {
            await db
              .update(userStats)
              .set({
                totalScheduledExecutions: sql`total_scheduled_executions + 1`,
                lastActive: now,
              })
              .where(eq(userStats.userId, workerRecord.userId))

            logger.debug(`[${requestId}] Updated user stats for scheduled execution`)
          } catch (statsError) {
            logger.error(`[${requestId}] Error updating user stats:`, statsError)
          }
        }

        const { traceSpans, totalDuration } = buildTraceSpans(executionResult)

        const enrichedResult = {
          ...executionResult,
          traceSpans,
          totalDuration,
        }

        await persistExecutionLogs(schedule.workerId, executionId, enrichedResult, 'schedule')

        if (executionResult.success) {
          logger.info(`[${requestId}] Worker ${schedule.workerId} executed successfully`)

          const nextRunAt = calculateNextRunTime(schedule, blocks)

          logger.debug(
            `[${requestId}] Calculated next run time: ${nextRunAt.toISOString()} for worker ${schedule.workerId}`
          )

          try {
            await db
              .update(workerSchedule)
              .set({
                lastRanAt: now,
                updatedAt: now,
                nextRunAt,
                failedCount: 0, // Reset failure count on success
              })
              .where(eq(workerSchedule.id, schedule.id))

            logger.debug(
              `[${requestId}] Updated next run time for worker ${schedule.workerId} to ${nextRunAt.toISOString()}`
            )
          } catch (updateError) {
            logger.error(`[${requestId}] Error updating schedule after success:`, updateError)
          }
        } else {
          logger.warn(`[${requestId}] Worker ${schedule.workerId} execution failed`)

          const newFailedCount = (schedule.failedCount || 0) + 1
          const shouldDisable = newFailedCount >= MAX_CONSECUTIVE_FAILURES
          const nextRunAt = calculateNextRunTime(schedule, blocks)

          if (shouldDisable) {
            logger.warn(
              `[${requestId}] Disabling schedule for worker ${schedule.workerId} after ${MAX_CONSECUTIVE_FAILURES} consecutive failures`
            )
          }

          try {
            await db
              .update(workerSchedule)
              .set({
                updatedAt: now,
                nextRunAt,
                failedCount: newFailedCount,
                lastFailedAt: now,
                status: shouldDisable ? 'disabled' : 'active',
              })
              .where(eq(workerSchedule.id, schedule.id))

            logger.debug(`[${requestId}] Updated schedule after failure`)
          } catch (updateError) {
            logger.error(`[${requestId}] Error updating schedule after failure:`, updateError)
          }
        }
      } catch (error: any) {
        logger.error(`[${requestId}] Error executing scheduled worker ${schedule.workerId}`, error)

        await persistExecutionError(schedule.workerId, executionId, error, 'schedule')

        let nextRunAt: Date
        try {
          const [workerRecord] = await db
            .select()
            .from(worker)
            .where(eq(worker.id, schedule.workerId))
            .limit(1)

          if (workerRecord) {
            const normalizedData = await loadWorkerFromNormalizedTables(schedule.workerId)

            if (!normalizedData) {
              nextRunAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)
            } else {
              nextRunAt = calculateNextRunTime(schedule, normalizedData.blocks)
            }
          } else {
            nextRunAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)
          }
        } catch (workerError) {
          logger.error(
            `[${requestId}] Error retrieving worker for next run calculation`,
            workerError
          )
          nextRunAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours as a fallback
        }

        const newFailedCount = (schedule.failedCount || 0) + 1
        const shouldDisable = newFailedCount >= MAX_CONSECUTIVE_FAILURES

        if (shouldDisable) {
          logger.warn(
            `[${requestId}] Disabling schedule for worker ${schedule.workerId} after ${MAX_CONSECUTIVE_FAILURES} consecutive failures`
          )
        }

        try {
          await db
            .update(workerSchedule)
            .set({
              updatedAt: now,
              nextRunAt,
              failedCount: newFailedCount,
              lastFailedAt: now,
              status: shouldDisable ? 'disabled' : 'active',
            })
            .where(eq(workerSchedule.id, schedule.id))

          logger.debug(`[${requestId}] Updated schedule after execution error`)
        } catch (updateError) {
          logger.error(`[${requestId}] Error updating schedule after execution error:`, updateError)
        }
      } finally {
        runningExecutions.delete(schedule.workerId)
      }
    }
  } catch (error: any) {
    logger.error(`[${requestId}] Error in scheduled execution handler`, error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    message: 'Scheduled worker executions processed',
    executedCount: dueSchedules.length,
  })
}
