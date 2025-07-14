import { and, asc, eq } from 'drizzle-orm'
import { unstable_cache as cache } from 'next/cache'
import 'server-only'
import { db } from '@nusoma/database'
import { project as projectTable, task as taskTable } from '@nusoma/database/schema'
import type { TaskDto } from '@nusoma/types/dtos/task-dto'
import { getSession } from '@/lib/auth-server'
import { ValidationError } from '@/lib/errors'
import { Caching, defaultRevalidateTimeInSeconds, UserCacheKey } from '@/caching'
import {
  type GetProjectTasksSchema,
  getProjectTasksSchema,
} from '@/schemas/projects/get-project-tasks-schema'

export async function getProjectTasks(input: GetProjectTasksSchema): Promise<TaskDto[]> {
  const session = await getSession()

  if (!session || !session.user?.id) {
    throw new ValidationError('User not authenticated')
  }

  const result = getProjectTasksSchema.safeParse(input)
  if (!result.success) {
    throw new ValidationError(JSON.stringify(result.error.flatten()))
  }
  const parsedInput = result.data

  return cache(
    async () => {
      const projectTasks = await db
        .select({
          id: taskTable.id,
          projectId: taskTable.projectId,
          title: taskTable.title,
          description: taskTable.description,
          status: taskTable.status,
          assigneeId: taskTable.assigneeId,
          priority: taskTable.priority,
          tags: taskTable.tags,
          workspaceId: projectTable.workspaceId,
          projectName: projectTable.name,
          projectStage: projectTable.stage,
          projectPriority: projectTable.priority,
          scheduleDate: taskTable.scheduleDate,
          createdAt: taskTable.createdAt,
          updatedAt: taskTable.updatedAt,
        })
        .from(taskTable)
        .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
        .where(and(eq(taskTable.projectId, parsedInput.projectId)))
        .orderBy(asc(taskTable.createdAt))

      const response: TaskDto[] = projectTasks.map((task) => ({
        id: task.id,
        projectId: task.projectId ?? undefined,
        title: task.title,
        description: task.description ?? undefined,
        status: task.status,
        assigneeId: task.assigneeId ?? undefined,
        priority: task.priority,
        tags: (task.tags ?? []).map((tag, index) => ({
          id: `${task.id}-${index}`,
          text: tag,
        })),
        workspaceId: task.workspaceId ?? undefined,
        project: {
          id: task.projectId ?? '',
          name: task.projectName ?? '',
          workspaceId: task.workspaceId ?? '',
          workspaceName: '', // TODO: Add workspace name to query if needed
        },
        scheduleDate: task.scheduleDate ?? undefined,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      }))

      return response
    },
    Caching.createUserKeyParts(UserCacheKey.Tasks, session.user.id, parsedInput.projectId),
    {
      revalidate: defaultRevalidateTimeInSeconds,
      tags: [Caching.createUserTag(UserCacheKey.Tasks, session.user.id, parsedInput.projectId)],
    }
  )()
}
