'use server'

import { db } from '@nusoma/database'
import { projectNote as projectNoteTable } from '@nusoma/database/schema'
import { revalidateTag } from 'next/cache'
import { authActionClient } from '@/app/(dashboard)/safe-action'
import { Caching, UserCacheKey } from '@/caching'
import { addProjectNoteSchema } from '@/schemas/projects/add-project-note-schema'

export const addProjectNote = authActionClient
  .metadata({ actionName: 'addProjectNote' })
  .schema(addProjectNoteSchema)
  .action(async ({ parsedInput, ctx }) => {
    await db.insert(projectNoteTable).values({
      projectId: parsedInput.projectId,
      text: parsedInput.text ?? undefined,
      userId: ctx.session.userId,
    })

    revalidateTag(
      Caching.createUserTag(UserCacheKey.ProjectNotes, ctx.user.id, parsedInput.projectId)
    )
  })
