'use server'

import { db } from '@nusoma/database'
import { project as projectTable } from '@nusoma/database/schema'
import { and, eq } from 'drizzle-orm'
import { revalidateTag } from 'next/cache'
import { NotFoundError } from '@/lib/errors'
import { authActionClient } from '@/app/(dashboard)/safe-action'
import { Caching, UserCacheKey } from '@/caching'
import { updateProjectStageSchema } from '@/schemas/projects/update-project-stage-schema'
import { updateProjectAndCaptureEvent } from './_project-event-capture'

export const updateProjectStage = authActionClient
  .metadata({ actionName: 'updateProjectStage' })
  .schema(updateProjectStageSchema)
  .action(async ({ parsedInput, ctx }) => {
    const [project] = await db
      .select({})
      .from(projectTable)
      .where(and(eq(projectTable.id, parsedInput.id)))
      .limit(1)

    if (!project) {
      throw new NotFoundError('Project not found')
    }

    await updateProjectAndCaptureEvent(parsedInput.id, { stage: parsedInput.stage }, ctx.user.id)

    revalidateTag(Caching.createUserTag(UserCacheKey.Projects, ctx.user.id))
    revalidateTag(Caching.createUserTag(UserCacheKey.Project, ctx.user.id, parsedInput.id))
  })
