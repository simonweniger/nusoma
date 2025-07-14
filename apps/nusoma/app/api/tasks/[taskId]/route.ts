import { db } from '@nusoma/database'
import {
  Priority,
  project as projectTable,
  TaskStatus,
  task as taskTable,
  taskTag as taskTagTable,
  taskToTaskTag as taskToTaskTagTable,
  workspace,
} from '@nusoma/database/schema'
import { jsonAggBuildObject } from '@nusoma/database/utils'
import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  assigneeId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  scheduleDate: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
})

async function getAuthenticatedUser() {
  const session = await getSession()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }
  return session.user
}

// GET /api/tasks/[taskId] - Get single task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getAuthenticatedUser()
    const { taskId } = await params

    const [task] = await db
      .select({
        id: taskTable.id,
        title: taskTable.title,
        description: taskTable.description,
        status: taskTable.status,
        assigneeId: taskTable.assigneeId,
        priority: taskTable.priority,
        scheduleDate: taskTable.scheduleDate,
        projectId: taskTable.projectId,
        createdAt: taskTable.createdAt,
        updatedAt: taskTable.updatedAt,
        resultReport: taskTable.resultReport,
        rawResult: taskTable.rawResult,
        tags: jsonAggBuildObject({
          id: taskTagTable.id,
          text: taskTagTable.text,
        }),
        // Project fields (can be null)
        projectName: projectTable.name,
        projectWorkspaceId: projectTable.workspaceId,
        projectWorkspaceName: workspace.name,
        // Task workspace fields (for tasks without projects)
        taskWorkspaceId: taskTable.workspaceId,
      })
      .from(taskTable)
      .leftJoin(projectTable, eq(taskTable.projectId, projectTable.id))
      .leftJoin(workspace, eq(projectTable.workspaceId, workspace.id))
      .leftJoin(taskToTaskTagTable, eq(taskToTaskTagTable.taskId, taskTable.id))
      .leftJoin(taskTagTable, eq(taskTagTable.id, taskToTaskTagTable.taskTagId))
      .where(eq(taskTable.id, taskId))
      .groupBy(
        taskTable.id,
        taskTable.title,
        taskTable.description,
        taskTable.status,
        taskTable.assigneeId,
        taskTable.priority,
        taskTable.scheduleDate,
        taskTable.projectId,
        taskTable.createdAt,
        taskTable.updatedAt,
        taskTable.resultReport,
        taskTable.rawResult,
        taskTable.workspaceId,
        projectTable.name,
        projectTable.workspaceId,
        workspace.name
      )
      .limit(1)

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const response = {
      id: task.id,
      workspaceId: task.taskWorkspaceId,
      projectId: task.projectId,
      title: task.title,
      description: task.description,
      status: task.status,
      assigneeId: task.assigneeId,
      priority: task.priority,
      tags: task.tags ?? [],
      scheduleDate: task.scheduleDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      resultReport: task.resultReport,
      rawResult: task.rawResult,
      projectName: task.projectName,
      projectWorkspaceId: task.projectWorkspaceId,
      projectWorkspaceName: task.projectWorkspaceName,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch task' },
      { status: 500 }
    )
  }
}

// PUT /api/tasks/[taskId] - Update task (simplified)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getAuthenticatedUser()
    const { taskId } = await params
    const body = await request.json()

    const validatedData = updateTaskSchema.parse(body)

    // Check if task exists
    const [existingTask] = await db
      .select()
      .from(taskTable)
      .where(eq(taskTable.id, taskId))
      .limit(1)

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Simple task update without complex event capture
    const updateData: any = {}

    if (validatedData.title !== undefined) updateData.title = validatedData.title
    if (validatedData.description !== undefined) updateData.description = validatedData.description
    if (validatedData.status !== undefined) updateData.status = validatedData.status
    if (validatedData.priority !== undefined) updateData.priority = validatedData.priority
    if (validatedData.assigneeId !== undefined) updateData.assigneeId = validatedData.assigneeId
    if (validatedData.projectId !== undefined) updateData.projectId = validatedData.projectId
    if (validatedData.scheduleDate !== undefined) {
      updateData.scheduleDate = validatedData.scheduleDate
        ? new Date(validatedData.scheduleDate)
        : null
    }
    if (validatedData.tags !== undefined) updateData.tags = validatedData.tags

    if (Object.keys(updateData).length > 0) {
      await db
        .update(taskTable)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(taskTable.id, taskId))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating task:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update task' },
      { status: 500 }
    )
  }
}

// DELETE /api/tasks/[taskId] - Delete single task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getAuthenticatedUser()
    const { taskId } = await params

    // Check if task exists
    const [existingTask] = await db
      .select()
      .from(taskTable)
      .where(eq(taskTable.id, taskId))
      .limit(1)

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    await db.delete(taskTable).where(eq(taskTable.id, taskId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete task' },
      { status: 500 }
    )
  }
}
