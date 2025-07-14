import 'server-only'

import { db } from '@nusoma/database'
import {
  ActionType,
  ActorType,
  TaskStatus,
  task,
  taskActivity,
  worker,
  workspaceMember,
} from '@nusoma/database/schema'
import { and, eq, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

const assignWorkerSchema = z.object({
  workerId: z.string().uuid().nullable(),
  projectId: z.string().uuid().optional(),
})

async function getAuthenticatedUser() {
  const session = await getSession()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }
  return session.user
}

// POST /api/tasks/[taskId]/assign - Assign or unassign worker
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getAuthenticatedUser()
    const { taskId } = await params
    const body = await request.json()

    const validatedData = assignWorkerSchema.parse(body)
    const { workerId, projectId } = validatedData

    // Handle unassignment
    if (!workerId) {
      try {
        // Remove any pending messages for this task from the queue
        try {
          const result = await db.execute(sql`
            WITH messages_to_delete AS (
              SELECT msg_id 
              FROM pgmq.read('task_queue', 1000, 1) 
              WHERE message->>'taskId' = ${taskId}
            )
            SELECT pgmq.delete('task_queue', msg_id) 
            FROM messages_to_delete
          `)
          console.log('Removed pending queue messages for task:', taskId)
        } catch (queueError) {
          console.warn('Failed to remove queue messages (task may not be in queue):', queueError)
        }

        await db
          .update(task)
          .set({ assigneeId: null, status: TaskStatus.TODO })
          .where(eq(task.id, taskId))

        return NextResponse.json({ success: true, message: 'Worker unassigned successfully' })
      } catch (dbError) {
        console.error('DB Error during unassignment:', dbError)
        throw new Error('Failed to unassign worker from database.')
      }
    }

    // Verify worker exists and user has access
    const workerExists = await db
      .select({
        id: worker.id,
        workspaceId: worker.workspaceId,
      })
      .from(worker)
      .where(eq(worker.id, workerId))
      .limit(1)

    if (workerExists.length === 0) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    const workerData = workerExists[0]

    // Check if user has access to the worker's workspace
    if (workerData.workspaceId) {
      const hasAccess = await db
        .select()
        .from(workspaceMember)
        .where(
          and(
            eq(workspaceMember.workspaceId, workerData.workspaceId),
            eq(workspaceMember.userId, user.id)
          )
        )
        .limit(1)
        .then((result) => result.length > 0)

      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied to worker' }, { status: 403 })
      }
    }

    try {
      const payload = { taskId, workerId, userId: user.id }

      await db.execute(sql`SELECT pgmq.send('task_queue', ${JSON.stringify(payload)}::jsonb)`)
      console.log('Message sent to pg_mq task_queue successfully for worker:', workerId)

      await db
        .update(task)
        .set({
          assigneeId: workerId,
          status: TaskStatus.IN_PROGRESS,
        })
        .where(eq(task.id, taskId))

      await db.insert(taskActivity).values({
        taskId: taskId,
        actionType: ActionType.TASK_IN_QUEUE,
        actorId: workerId,
        actorType: ActorType.SYSTEM,
        occurredAt: new Date(),
      })

      return NextResponse.json({
        success: true,
        message: 'Worker assigned and task enqueued for execution',
      })
    } catch (error) {
      console.error('Error during pg_mq send or DB update:', error)

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
  } catch (error) {
    console.error('Error assigning worker to task:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to assign worker' },
      { status: 500 }
    )
  }
}
