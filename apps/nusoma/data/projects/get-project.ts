import { eq } from 'drizzle-orm'
import { unstable_cache as cache } from 'next/cache'
import { notFound } from 'next/navigation'
import 'server-only'
import { db } from '@nusoma/database'
import {
  project as projectTable,
  projectTag as projectTagTable,
  projectToProjectTag as projectToProjectTagTable,
} from '@nusoma/database/schema'
import { jsonAggBuildObject } from '@nusoma/database/utils'
import type { ProjectDto } from '@nusoma/types/dtos/project-dto'
import { getSession } from '@/lib/auth-server'
import { ValidationError } from '@/lib/errors'
import { Caching, defaultRevalidateTimeInSeconds, UserCacheKey } from '@/caching'
import { type GetProjectSchema, getProjectSchema } from '@/schemas/projects/get-project-schema'

export async function getProject(input: GetProjectSchema): Promise<ProjectDto> {
  const session = await getSession()

  if (!session || !session.user?.id) {
    throw new ValidationError('User not authenticated')
  }

  const result = getProjectSchema.safeParse(input)
  if (!result.success) {
    throw new ValidationError(JSON.stringify(result.error.flatten()))
  }
  const parsedInput = result.data

  return cache(
    async () => {
      const [project] = await db
        .select({
          id: projectTable.id,
          priority: projectTable.priority,
          name: projectTable.name,
          description: projectTable.description,
          stage: projectTable.stage,
          createdAt: projectTable.createdAt,
          tags: jsonAggBuildObject({
            id: projectTagTable.id,
            text: projectTagTable.text,
          }),
        })
        .from(projectTable)
        .leftJoin(projectToProjectTagTable, eq(projectToProjectTagTable.projectId, projectTable.id))
        .leftJoin(projectTagTable, eq(projectTagTable.id, projectToProjectTagTable.projectTagId))
        .where(eq(projectTable.id, parsedInput.id))
        .groupBy(
          projectTable.id,
          projectTable.priority,
          projectTable.description,
          projectTable.name,
          projectTable.stage,
          projectTable.createdAt
        )

      if (!project) {
        return notFound()
      }

      const response: ProjectDto = {
        id: project.id,
        priority: project.priority,
        name: project.name,
        description: project.description,
        stage: project.stage,
        createdAt: project.createdAt,
        tags: project.tags ?? [],
      }

      return response
    },
    Caching.createUserKeyParts(UserCacheKey.Project, session.user.id, parsedInput.id),
    {
      revalidate: defaultRevalidateTimeInSeconds,
      tags: [Caching.createUserTag(UserCacheKey.Project, session.user.id, parsedInput.id)],
    }
  )()
}
