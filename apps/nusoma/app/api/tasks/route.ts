// TODO: Implement tasks crud route

import { db } from '@nusoma/database'
import {
  Priority,
  project as projectTable,
  TaskStatus,
  task as taskTable,
  taskTag as taskTagTable,
  taskToTaskTag as taskToTaskTagTable,
  workspace,
  workspaceMember,
} from '@nusoma/database/schema'
import { jsonAggBuildObject } from '@nusoma/database/utils'
import { desc, eq, inArray } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

// Validation schemas
const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus),
  priority: z.nativeEnum(Priority),
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
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

// GET /api/tasks - Get all user tasks
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    // Get user workspaces
    const userWorkspaces = await db
      .select({ workspaceId: workspaceMember.workspaceId })
      .from(workspaceMember)
      .where(eq(workspaceMember.userId, user.id))

    if (userWorkspaces.length === 0) {
      return NextResponse.json([])
    }

    const workspaceIds = userWorkspaces.map((w) => w.workspaceId)

    // Filter by specific workspace if provided
    const whereConditions = workspaceId
      ? eq(taskTable.workspaceId, workspaceId)
      : inArray(taskTable.workspaceId, workspaceIds)

    const tasksWithProjects = await db
      .select({
        id: taskTable.id,
        projectId: taskTable.projectId,
        title: taskTable.title,
        description: taskTable.description,
        status: taskTable.status,
        assigneeId: taskTable.assigneeId,
        priority: taskTable.priority,
        tags: jsonAggBuildObject({
          id: taskTagTable.id,
          text: taskTagTable.text,
        }),
        scheduleDate: taskTable.scheduleDate,
        createdAt: taskTable.createdAt,
        updatedAt: taskTable.updatedAt,
        resultReport: taskTable.resultReport,
        rawResult: taskTable.rawResult,
        taskWorkspaceId: taskTable.workspaceId,
        taskWorkspaceName: workspace.name,
        projectName: projectTable.name,
        projectWorkspaceId: projectTable.workspaceId,
      })
      .from(taskTable)
      .leftJoin(projectTable, eq(taskTable.projectId, projectTable.id))
      .innerJoin(workspace, eq(taskTable.workspaceId, workspace.id))
      .innerJoin(workspaceMember, eq(workspace.id, workspaceMember.workspaceId))
      .leftJoin(taskToTaskTagTable, eq(taskTable.id, taskToTaskTagTable.taskId))
      .leftJoin(taskTagTable, eq(taskToTaskTagTable.taskTagId, taskTagTable.id))
      .where(whereConditions)
      .groupBy(
        taskTable.id,
        taskTable.projectId,
        taskTable.title,
        taskTable.description,
        taskTable.status,
        taskTable.assigneeId,
        taskTable.priority,
        taskTable.scheduleDate,
        taskTable.createdAt,
        taskTable.updatedAt,
        taskTable.resultReport,
        taskTable.rawResult,
        taskTable.workspaceId,
        workspace.name,
        projectTable.name,
        projectTable.workspaceId
      )
      .orderBy(desc(taskTable.createdAt))

    const response = tasksWithProjects.map((task) => ({
      id: task.id,
      projectId: task.projectId ?? undefined,
      title: task.title,
      description: task.description ?? undefined,
      status: task.status,
      assigneeId: task.assigneeId ?? undefined,
      priority: task.priority,
      tags: task.tags || [],
      scheduleDate: task.scheduleDate ?? undefined,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      resultReport: task.resultReport ?? undefined,
      rawResult: task.rawResult ?? undefined,
      project:
        task.projectId && task.projectName
          ? {
              id: task.projectId,
              name: task.projectName,
              workspaceId: task.projectWorkspaceId!,
              workspaceName: task.taskWorkspaceName,
            }
          : null,
      workspaceId: task.taskWorkspaceId,
    }))

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

// POST /api/tasks - Create new task (simplified version)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const body = await request.json()

    const validatedData = createTaskSchema.parse(body)

    // Simple task creation without complex event capture for now
    const [newTask] = await db
      .insert(taskTable)
      .values({
        title: validatedData.title,
        description: validatedData.description || null,
        status: validatedData.status,
        priority: validatedData.priority,
        workspaceId: validatedData.workspaceId,
        projectId: validatedData.projectId || null,
        assigneeId: validatedData.assigneeId || null,
        scheduleDate: validatedData.scheduleDate ? new Date(validatedData.scheduleDate) : null,
        rawResult: {},
        resultReport: '',
        tags: validatedData.tags || [],
      })
      .returning()

    return NextResponse.json(newTask)
  } catch (error) {
    console.error('Error creating task:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create task' },
      { status: 500 }
    )
  }
}

// DELETE /api/tasks - Delete multiple tasks
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const { searchParams } = new URL(request.url)
    const ids = searchParams.get('ids')?.split(',') || []

    if (ids.length === 0) {
      return NextResponse.json({ error: 'No task IDs provided' }, { status: 400 })
    }

    await db.delete(taskTable).where(inArray(taskTable.id, ids))

    return NextResponse.json({ success: true, deletedCount: ids.length })
  } catch (error) {
    console.error('Error deleting tasks:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete tasks' },
      { status: 500 }
    )
  }
}
