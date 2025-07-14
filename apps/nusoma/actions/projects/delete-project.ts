'use server'

import { db } from '@nusoma/database'
import { project as projectTable } from '@nusoma/database/schema'
import { and, eq } from 'drizzle-orm'
import { revalidateTag } from 'next/cache'
import { NotFoundError } from '@/lib/errors'
import { authActionClient } from '@/app/(dashboard)/safe-action'
import { Caching, UserCacheKey } from '@/caching'
import { deleteProjectSchema } from '@/schemas/projects/delete-project-schema'

export const deleteProject = authActionClient
  .metadata({ actionName: 'deleteProject' })
  .schema(deleteProjectSchema)
  .action(async ({ parsedInput, ctx }) => {
    const [project] = await db
      .select({})
      .from(projectTable)
      .where(
        and(
          eq(projectTable.id, parsedInput.id),
          eq(projectTable.workspaceId, parsedInput.workspaceId)
        )
      )
      .limit(1)

    if (!project) {
      throw new NotFoundError('Project not found')
    }

    await db.transaction(async (tx) => {
      await tx.delete(projectTable).where(eq(projectTable.id, parsedInput.id))
    })

    revalidateTag(Caching.createUserTag(UserCacheKey.Projects, ctx.user.id))

    revalidateTag(Caching.createUserTag(UserCacheKey.Project, ctx.user.id, parsedInput.id))
  })
