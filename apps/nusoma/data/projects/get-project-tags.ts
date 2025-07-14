import { eq } from 'drizzle-orm'
import { unstable_cache as cache } from 'next/cache'
import 'server-only'
import { db } from '@nusoma/database'
import {
  project as projectTable,
  projectTag as projectTagTable,
  projectToProjectTag as projectToProjectTagTable,
} from '@nusoma/database/schema'
import type { TagDto } from '@nusoma/types/dtos/tag-dto'
import { getSession } from '@/lib/auth-server'
import { ValidationError } from '@/lib/errors'
import { Caching, defaultRevalidateTimeInSeconds, UserCacheKey } from '@/caching'
import {
  type GetProjectTagsSchema,
  getProjectTagsSchema,
} from '@/schemas/projects/get-project-tags'

export async function getProjectTags(input: GetProjectTagsSchema): Promise<TagDto[]> {
  const session = await getSession()

  if (!session || !session.user?.id) {
    throw new ValidationError('User not authenticated')
  }

  const result = getProjectTagsSchema.safeParse(input)
  if (!result.success) {
    throw new ValidationError(JSON.stringify(result.error.flatten()))
  }
  const parsedInput = result.data

  return cache(
    async () => {
      const projectTags = await db
        .selectDistinct({
          id: projectTagTable.id,
          text: projectTagTable.text,
        })
        .from(projectTagTable)
        .innerJoin(
          projectToProjectTagTable,
          eq(projectTagTable.id, projectToProjectTagTable.projectTagId)
        )
        .innerJoin(projectTable, eq(projectToProjectTagTable.projectId, projectTable.id))
        .where(eq(projectTable.workspaceId, parsedInput.workspaceId))
        .orderBy(projectTagTable.text)

      return projectTags
    },
    Caching.createUserKeyParts(UserCacheKey.ProjectTags, session.user.id, parsedInput.workspaceId),
    {
      revalidate: defaultRevalidateTimeInSeconds,
      tags: [
        Caching.createUserTag(UserCacheKey.ProjectTags, session.user.id, parsedInput.workspaceId),
        Caching.createUserTag(UserCacheKey.Projects, session.user.id, parsedInput.workspaceId),
      ],
    }
  )()
}
