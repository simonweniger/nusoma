import 'server-only'

import { db } from '@nusoma/database'
import {
  ActorType,
  taskActivity as taskActivityTable,
  taskComment as taskCommentTable,
  task as taskTable,
  user as userTable,
} from '@nusoma/database/schema'
import type {
  ActivityTimelineEventDto,
  BlockExecutionTimelineEventDto,
  CommentTimelineEventDto,
  TimelineEventDto,
} from '@nusoma/types/dtos/timeline-event-dto'
import { desc, eq, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

const addActivitySchema = z.object({
  actionType: z.string(),
  metadata: z.record(z.any()).optional(),
})

async function getAuthenticatedUser() {
  const session = await getSession()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }
  return session.user
}

// GET /api/tasks/[taskId]/activities - Fetch task activities and comments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params
    const user = await getAuthenticatedUser()

    // Check if task exists
    const [task] = await db.select().from(taskTable).where(eq(taskTable.id, taskId)).limit(1)

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Fetch activities with user information (only join users for MEMBER actors)
    const activitiesData = await db
      .select({
        id: taskActivityTable.id,
        taskId: taskActivityTable.taskId,
        actionType: taskActivityTable.actionType,
        actorId: taskActivityTable.actorId,
        actorType: taskActivityTable.actorType,
        metadata: taskActivityTable.metadata,
        occurredAt: taskActivityTable.occurredAt,
        actorName: userTable.name,
        actorImage: userTable.image,
      })
      .from(taskActivityTable)
      .leftJoin(
        userTable,
        sql`${taskActivityTable.actorType} = 'member' AND ${taskActivityTable.actorId}::uuid = ${userTable.id}`
      )
      .where(eq(taskActivityTable.taskId, taskId))
      .orderBy(desc(taskActivityTable.occurredAt))

    // Fetch comments with user information
    const commentsData = await db
      .select({
        id: taskCommentTable.id,
        taskId: taskCommentTable.taskId,
        text: taskCommentTable.text,
        userId: taskCommentTable.userId,
        createdAt: taskCommentTable.createdAt,
        updatedAt: taskCommentTable.updatedAt,
        userName: userTable.name,
        userImage: userTable.image,
      })
      .from(taskCommentTable)
      .leftJoin(userTable, eq(taskCommentTable.userId, userTable.id))
      .where(eq(taskCommentTable.taskId, taskId))
      .orderBy(desc(taskCommentTable.createdAt))

    // Transform activities to DTOs
    const activityEvents: (ActivityTimelineEventDto | BlockExecutionTimelineEventDto)[] =
      activitiesData.map((activity) => {
        const actor = {
          id: activity.actorId,
          name: activity.actorType === ActorType.SYSTEM ? 'System' : activity.actorName || 'User',
          image: activity.actorImage || undefined,
        }

        // Handle block execution activities
        if (activity.actionType === 'blockExecuted' && activity.metadata) {
          const metadata = activity.metadata as {
            executionId?: string
            totalBlocks?: number
            failedBlocks?: number
            successfulBlocks?: number
          }

          return {
            id: activity.id,
            projectId: task.projectId || '',
            type: 'block-execution' as const,
            executionId: metadata.executionId || '',
            totalBlocks: metadata.totalBlocks || 0,
            failedBlocks: metadata.failedBlocks || 0,
            successfulBlocks: metadata.successfulBlocks || 0,
            occurredAt: activity.occurredAt,
            actor,
          } as BlockExecutionTimelineEventDto
        }

        // Handle regular activities
        return {
          id: activity.id,
          projectId: task.projectId || '',
          type: 'activity' as const,
          actionType: activity.actionType,
          metadata: activity.metadata,
          occurredAt: activity.occurredAt,
          actor,
        } as ActivityTimelineEventDto
      })

    // Transform comments to DTOs
    const commentEvents: CommentTimelineEventDto[] = commentsData.map((comment) => {
      const isEdited = comment.createdAt.getTime() !== comment.updatedAt.getTime()

      return {
        id: comment.id,
        projectId: task.projectId || '',
        type: 'comment' as const,
        text: comment.text,
        edited: isEdited,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        sender: {
          id: comment.userId,
          name: comment.userName || 'User',
          image: comment.userImage || undefined,
        },
      }
    })

    // Combine and sort all events by time
    const allEvents: (TimelineEventDto | CommentTimelineEventDto)[] = [
      ...activityEvents,
      ...commentEvents,
    ].sort((a, b) => {
      const aTime = a.type === 'comment' ? a.createdAt : a.occurredAt
      const bTime = b.type === 'comment' ? b.createdAt : b.occurredAt
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })

    return NextResponse.json(allEvents)
  } catch (error) {
    console.error('Error fetching task activities:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch activities' },
      { status: 500 }
    )
  }
}

// POST /api/tasks/[taskId]/activities - Add task activity
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getAuthenticatedUser()
    const { taskId } = await params
    const body = await request.json()

    const validatedData = addActivitySchema.parse(body)

    // Check if task exists
    const [task] = await db.select().from(taskTable).where(eq(taskTable.id, taskId)).limit(1)

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const [activity] = await db
      .insert(taskActivityTable)
      .values({
        taskId,
        actionType: validatedData.actionType as any, // Type assertion for enum
        actorId: user.id,
        actorType: ActorType.MEMBER,
        metadata: validatedData.metadata,
      })
      .returning()

    return NextResponse.json(activity)
  } catch (error) {
    console.error('Error creating task activity:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create activity' },
      { status: 500 }
    )
  }
}
