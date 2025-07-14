'use server'

import { and, db, eq } from '@nusoma/database'
import { projectNote as projectNoteTable, project as projectTable } from '@nusoma/database/schema'
import { revalidateTag } from 'next/cache'
import { NotFoundError } from '@/lib/errors'
import { authActionClient } from '@/app/(dashboard)/safe-action'
import { Caching, UserCacheKey } from '@/caching'
import { deleteProjectNoteSchema } from '@/schemas/projects/delete-project-note-schema'

export const deleteProjectNote = authActionClient
  .metadata({ actionName: 'deleteProjectNote' })
  .schema(deleteProjectNoteSchema)
  .action(async ({ parsedInput, ctx }) => {
    const [projectNote] = await db
      .select({
        projectId: projectNoteTable.projectId,
      })
      .from(projectNoteTable)
      .innerJoin(projectTable, eq(projectNoteTable.projectId, projectTable.id))
      .where(
        and(
          eq(projectNoteTable.id, parsedInput.id)
          //eq(projectTable.organizationId, ctx.organization.id)
        )
      )
      .limit(1)

    if (!projectNote) {
      throw new NotFoundError('Note not found')
    }

    await db.delete(projectNoteTable).where(eq(projectNoteTable.id, parsedInput.id))

    revalidateTag(Caching.createUserTag(UserCacheKey.ProjectNotes, ctx.user.id, parsedInput.id))
  })
