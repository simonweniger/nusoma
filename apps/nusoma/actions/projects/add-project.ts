'use server'

import { revalidateTag } from 'next/cache'
import { authActionClient } from '@/app/(dashboard)/safe-action'
import { Caching, UserCacheKey } from '@/caching'
import { addProjectSchema } from '@/schemas/projects/add-project-schema'
import { createProjectAndCaptureEvent } from './_project-event-capture'

export const addProject = authActionClient
  .metadata({ actionName: 'addProject' })
  .schema(addProjectSchema)
  .action(async ({ parsedInput, ctx }) => {
    await createProjectAndCaptureEvent(
      {
        workspaceId: parsedInput.workspaceId,
        name: parsedInput.name,
        description: parsedInput.description ?? null,
        createdBy: ctx.user.id,
        stage: parsedInput.stage,
        priority: parsedInput.priority,
      },
      ctx.user.id
    )

    revalidateTag(Caching.createUserTag(UserCacheKey.Projects, ctx.user.id))
  })
