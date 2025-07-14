'use server'

import { db } from '@nusoma/database'
import { project as projectTable } from '@nusoma/database/schema'
import { and, eq } from 'drizzle-orm'
import { revalidateTag } from 'next/cache'
import { NotFoundError } from '@/lib/errors'
import { authActionClient } from '@/app/(dashboard)/safe-action'
import { Caching, UserCacheKey } from '@/caching'
import { updateProjectPropertiesSchema } from '@/schemas/projects/update-project-properties-schema'
import { updateProjectAndCaptureEvent } from './_project-event-capture'

export const updateProjectProperties = authActionClient
  .metadata({ actionName: 'updateProjectProperties' })
  .schema(updateProjectPropertiesSchema)
  .action(async ({ parsedInput, ctx }) => {
    const [project] = await db
      .select({})
      .from(projectTable)
      .where(and(eq(projectTable.id, parsedInput.id)))
      .limit(1)

    if (!project) {
      throw new NotFoundError('Project not found')
    }

    await updateProjectAndCaptureEvent(
      parsedInput.id,
      {
        stage: parsedInput.stage,
        name: parsedInput.name,
        description: parsedInput.description,
        //assigneeId: parsedInput.assigneeId,
        priority: parsedInput.priority,
      },
      ctx.user.id
    )

    revalidateTag(Caching.createUserTag(UserCacheKey.Projects, ctx.user.id))
    revalidateTag(Caching.createUserTag(UserCacheKey.Project, ctx.user.id, parsedInput.id))
  })
