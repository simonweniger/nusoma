'use server'

import { db } from '@nusoma/database'
import {
  ActionType,
  ActorType,
  task,
  taskActivity,
  worker,
  workspaceMember,
} from '@nusoma/database/schema'
import { and, eq, sql } from 'drizzle-orm'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
//import { env } from '@/lib/env'
import { createLogger } from '@/lib/logger/console-logger'
import { authActionClient } from '@/app/(dashboard)/safe-action'
import { Caching, UserCacheKey } from '@/caching'

const logger = createLogger('AssignWorkerToTaskAction')

const assignWorkerToTaskSchema = z.object({
  taskId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  workerId: z.string().uuid().nullable(),
})

export const assignWorkerToTask = authActionClient
  .metadata({ actionName: 'assignWorkerToTask' })
  .schema(assignWorkerToTaskSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { taskId, projectId, workerId } = parsedInput

    // Handle unassignment
    if (!workerId) {
      logger.info('Unassigning worker from task.')
      try {
        await db.update(task).set({ assigneeId: null }).where(eq(task.id, taskId))
        logger.info('DB: Successfully unassigned worker.')
        if (projectId) {
          revalidateTag(Caching.createUserTag(UserCacheKey.Tasks, ctx.user.id, projectId as string))
        }
        logger.info('--- Assign Worker Action End (Unassigned) ---')
        return { success: 'Worker unassigned successfully' }
      } catch (dbError) {
        logger.error('DB Error during unassignment:', dbError)
        throw new Error('Failed to unassign worker from database.')
      }
    }

    logger.info('Assigning worker. Verifying worker and access...')

    const workerExists = await db
      .select({
        id: worker.id,
        workspaceId: worker.workspaceId,
        userId: worker.userId,
      })
      .from(worker)
      .where(eq(worker.id, workerId))
      .limit(1)

    if (workerExists.length === 0) {
      logger.error('Worker not found:', workerId)
      throw new Error('Worker not found')
    }

    const workerData = workerExists[0]

    // Check if user has access to the worker
    const hasAccess =
      workerData.userId === ctx.user.id ||
      (workerData.workspaceId &&
        (await db
          .select()
          .from(workspaceMember)
          .where(
            and(
              eq(workspaceMember.workspaceId, workerData.workspaceId),
              eq(workspaceMember.userId, ctx.user.id)
            )
          )
          .limit(1)
          .then((result) => result.length > 0)))

    if (!hasAccess) {
      logger.error('Access denied to worker:', workerId, 'for user:', ctx.user.id)
      throw new Error('Access denied to worker')
    }

    logger.info('Worker and access verified.')

    try {
      const payload = { taskId, workerId, userId: ctx.user.id }

      // Check for visible messages in the queue before adding a new one.
      // const countResult = await db.execute(
      //   sql`SELECT count(*) FROM pgmq.q_task_queue WHERE vt <= now()`
      // )
      // const visibleMessages = Number.parseInt((countResult as any)[0].count, 10)

      await db.execute(sql`SELECT pgmq.send('task_queue', ${JSON.stringify(payload)}::jsonb)`)
      logger.info('Message sent to pg_mq task_queue successfully for worker:', workerId)

      await db
        .update(task)
        .set({
          assigneeId: workerId, // Set to the new workerId
        })
        .where(eq(task.id, taskId))

      // If the queue was empty, trigger processing immediately.
      // This avoids redundant triggers when the cron is already busy.
      // if (visibleMessages === 0) {
      //   fetch(`${env.NEXT_PUBLIC_APP_URL}/api/tasks/process`).catch((err) => {
      //     logger.error('Failed to trigger immediate task processing:', err)
      //   })
      //   logger.info('Queue was empty, triggered immediate processing.')
      // }

      await db.insert(taskActivity).values({
        taskId: taskId,
        actionType: ActionType.TASK_IN_QUEUE,
        actorId: workerId,
        actorType: ActorType.SYSTEM,
        occurredAt: new Date(),
      })

      if (projectId) {
        revalidateTag(Caching.createUserTag(UserCacheKey.Tasks, ctx.user.id, projectId as string))
      }

      return { success: 'Worker assigned and task enqueued for execution' }
    } catch (error) {
      logger.error('Error during pg_mq send or DB update:', error)
      await db.insert(taskActivity).values({
        taskId: taskId,
        actionType: ActionType.TASK_FAILED,
        actorId: workerId,
        actorType: ActorType.SYSTEM,
        occurredAt: new Date(),
      })
      const errorMessage =
        error instanceof Error && error.message
          ? error.message
          : 'Failed to assign worker due to an unexpected error.'
      throw new Error(errorMessage)
    }
  })
