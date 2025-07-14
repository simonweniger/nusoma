import { and, asc, eq } from 'drizzle-orm'
import { unstable_cache as cache } from 'next/cache'
import 'server-only'
import { db } from '@nusoma/database'
import {
  projectNote as projectNoteTable,
  project as projectTable,
  user,
} from '@nusoma/database/schema'
import type { ProjectNoteDto } from '@nusoma/types/dtos/project-note-dto'
import { getSession } from '@/lib/auth-server'
import { ValidationError } from '@/lib/errors'
import { Caching, defaultRevalidateTimeInSeconds, UserCacheKey } from '@/caching'
import {
  type GetProjectNotesSchema,
  getProjectNotesSchema,
} from '@/schemas/projects/get-project-notes-schema'

export async function getProjectNotes(input: GetProjectNotesSchema): Promise<ProjectNoteDto[]> {
  const session = await getSession()

  if (!session || !session.user?.id) {
    throw new ValidationError('User not authenticated')
  }

  const result = getProjectNotesSchema.safeParse(input)
  if (!result.success) {
    throw new ValidationError(JSON.stringify(result.error.flatten()))
  }
  const parsedInput = result.data

  return cache(
    async () => {
      const projectNotes = await db
        .select({
          id: projectNoteTable.id,
          projectId: projectNoteTable.projectId,
          text: projectNoteTable.text,
          createdAt: projectNoteTable.createdAt,
          updatedAt: projectNoteTable.updatedAt,
          user: {
            id: user.id,
            name: user.name,
            image: user.image,
          },
        })
        .from(projectNoteTable)
        .innerJoin(user, eq(projectNoteTable.userId, user.id))
        .innerJoin(projectTable, eq(projectNoteTable.projectId, projectTable.id))
        .where(
          and(
            //eq(projectTable.workspaceId, parsedInput.workspaceId),
            eq(projectNoteTable.projectId, parsedInput.projectId)
          )
        )
        .orderBy(asc(projectNoteTable.createdAt))

      const response: ProjectNoteDto[] = projectNotes.map((note) => ({
        id: note.id,
        projectId: note.projectId,
        text: note.text ?? undefined,
        edited: note.createdAt.getTime() !== note.updatedAt.getTime(),
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        sender: {
          id: note.user.id,
          name: note.user.name,
          image: note.user.image ?? undefined,
        },
      }))

      return response
    },
    Caching.createUserKeyParts(UserCacheKey.ProjectNotes, session.user.id, parsedInput.projectId),
    {
      revalidate: defaultRevalidateTimeInSeconds,
      tags: [
        Caching.createUserTag(UserCacheKey.ProjectNotes, session.user.id, parsedInput.projectId),
        Caching.createUserTag(UserCacheKey.Project, session.user.id, parsedInput.projectId),
        Caching.createUserTag(UserCacheKey.Projects, session.user.id, parsedInput.projectId),
      ],
    }
  )()
}
