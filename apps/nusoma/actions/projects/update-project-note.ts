'use server'

import { and, db, eq } from '@nusoma/database'
import { projectNote as projectNoteTable, project as projectTable } from '@nusoma/database/schema'
import { revalidateTag } from 'next/cache'
import { NotFoundError } from '@/lib/errors'
import { authActionClient } from '@/app/(dashboard)/safe-action'
import { Caching, UserCacheKey } from '@/caching'
import { updateProjectNoteSchema } from '@/schemas/projects/update-project-note-schema'

export const updateProjectNote = authActionClient
  .metadata({ actionName: 'updateProjectNote' })
  .schema(updateProjectNoteSchema)
  .action(async ({ parsedInput, ctx }) => {
    const [projectNote] = await db
      .select({})
      .from(projectNoteTable)
      .innerJoin(projectTable, eq(projectNoteTable.projectId, projectTable.id))
      .where(
        and(
          //eq(taskTable.organizationId, ctx.organization.id),
          eq(projectNoteTable.id, parsedInput.id)
        )
      )
      .limit(1)

    if (!projectNote) {
      throw new NotFoundError('Project note not found')
    }

    await db
      .update(projectNoteTable)
      .set({ text: parsedInput.text })
      .where(eq(projectNoteTable.id, parsedInput.id))
      .returning({ projectId: projectNoteTable.projectId })

    revalidateTag(Caching.createUserTag(UserCacheKey.ProjectNotes, ctx.user.id, parsedInput.id))
  })
