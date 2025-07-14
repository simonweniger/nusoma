'use server'

import { db } from '@nusoma/database'
import { project as projectTable, task as taskTable } from '@nusoma/database/schema'
import { and, eq } from 'drizzle-orm'
import { revalidateTag } from 'next/cache'
import { NotFoundError } from '@/lib/errors'
import { authActionClient } from '@/app/(dashboard)/safe-action'
import { Caching, UserCacheKey } from '@/caching'
import { updateProjectTaskSchema } from '@/schemas/projects/update-project-task-schema'

export const updateProjectTask = authActionClient
  .metadata({ actionName: 'updateProjectTask' })
  .schema(updateProjectTaskSchema)
  .action(async ({ parsedInput, ctx }) => {
    const [projectTask] = await db
      .select({
        projectId: taskTable.projectId,
        workspaceId: taskTable.workspaceId,
      })
      .from(taskTable)
      .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
      .where(and(eq(taskTable.id, parsedInput.id)))
      .limit(1)

    if (!projectTask) {
      throw new NotFoundError('Project task not found')
    }

    await db
      .update(taskTable)
      .set({
        title: parsedInput.title,
        description: parsedInput.description ? parsedInput.description : null,
        status: parsedInput.status,
        scheduleDate: parsedInput.scheduleDate ? parsedInput.scheduleDate : null,
      })
      .where(eq(taskTable.id, parsedInput.id))

    // Revalidate project-specific tasks and all user tasks
    revalidateTag(Caching.createUserTag(UserCacheKey.Tasks, ctx.user.id, projectTask.workspaceId))
    revalidateTag(Caching.createUserTag(UserCacheKey.Tasks, ctx.user.id))
  })
