'use server'

import { db } from '@nusoma/database'
import { project as projectTable } from '@nusoma/database/schema'
import { and, eq, inArray } from 'drizzle-orm'
import { revalidateTag } from 'next/cache'
import { authActionClient } from '@/app/(dashboard)/safe-action'
import { Caching, UserCacheKey } from '@/caching'
import { deleteProjectsSchema } from '@/schemas/projects/delete-projects-schema'

export const deleteProjects = authActionClient
  .metadata({ actionName: 'deleteProjects' })
  .schema(deleteProjectsSchema)
  .action(async ({ parsedInput, ctx }) => {
    await db
      .delete(projectTable)
      .where(
        and(
          inArray(projectTable.id, parsedInput.ids),
          eq(projectTable.workspaceId, parsedInput.workspaceId)
        )
      )

    revalidateTag(Caching.createUserTag(UserCacheKey.Projects, ctx.user.id))

    for (const id of parsedInput.ids) {
      revalidateTag(Caching.createUserTag(UserCacheKey.Project, id))
    }
  })
