import { and, asc, count, desc, eq, exists, inArray, sql } from 'drizzle-orm'
import { unstable_cache as cache } from 'next/cache'
import 'server-only'
import { db } from '@nusoma/database'
import {
  Priority,
  project as projectTable,
  projectTag as projectTagTable,
  projectToProjectTag as projectToProjectTagTable,
} from '@nusoma/database/schema'
import type { ProjectDto } from '@nusoma/types/dtos/project-dto'
import { SortDirection } from '@nusoma/types/sort-direction'
import { getSession } from '@/lib/auth-server'
import { ValidationError } from '@/lib/errors'
import { Caching, defaultRevalidateTimeInSeconds, UserCacheKey } from '@/caching'
import { type GetProjectsSchema, getProjectsSchema } from '@/schemas/projects/get-projects-schema'

export async function getProjects(input: GetProjectsSchema): Promise<{
  projects: ProjectDto[]
  filteredCount: number
  totalCount: number
}> {
  const session = await getSession()

  if (!session || !session.user?.id) {
    throw new ValidationError('User not authenticated')
  }

  const result = getProjectsSchema.safeParse(input)
  if (!result.success) {
    throw new ValidationError(JSON.stringify(result.error.flatten()))
  }

  const parsedInput = result.data

  return cache(
    async () => {
      const conditions = [eq(projectTable.workspaceId, parsedInput.workspaceId)]

      // Add priority filter if specified
      if (parsedInput.priority === Priority.LOW) {
        conditions.push(eq(projectTable.priority, Priority.LOW))
      } else if (parsedInput.priority === Priority.MEDIUM) {
        conditions.push(eq(projectTable.priority, Priority.MEDIUM))
      } else if (parsedInput.priority === Priority.HIGH) {
        conditions.push(eq(projectTable.priority, Priority.HIGH))
      } else if (parsedInput.priority === Priority.URGENT) {
        conditions.push(eq(projectTable.priority, Priority.URGENT))
      }

      // Add tags filter if specified
      if (parsedInput.tags && parsedInput.tags.length > 0) {
        conditions.push(
          exists(
            db
              .select({})
              .from(projectToProjectTagTable)
              .innerJoin(
                projectTagTable,
                eq(projectToProjectTagTable.projectTagId, projectTagTable.id)
              )
              .where(
                and(
                  eq(projectToProjectTagTable.projectId, projectTable.id),
                  inArray(projectTagTable.text, parsedInput.tags)
                )
              )
          )
        )
      }

      // Add search query filter if specified
      if (parsedInput.searchQuery) {
        conditions.push(
          sql`(${projectTable.name} ILIKE ${`%${parsedInput.searchQuery}%`} OR ${projectTable.name} ILIKE ${`%${parsedInput.searchQuery}%`})`
        )
      }

      const whereClause = and(...conditions)

      const [projects, filteredCount, totalCount] = await Promise.all([
        db
          .select({
            id: projectTable.id,
            priority: projectTable.priority,
            name: projectTable.name,
            stage: projectTable.stage,
            createdAt: projectTable.createdAt,
          })
          .from(projectTable)
          .where(whereClause)
          .limit(parsedInput.pageSize)
          .offset(parsedInput.pageIndex * parsedInput.pageSize)
          .orderBy(getOrderBy(parsedInput.sortBy, parsedInput.sortDirection)),
        db
          .select({ count: count() })
          .from(projectTable)
          .where(whereClause)
          .then((res) => res[0].count),
        db
          .select({ count: count() })
          .from(projectTable)
          .where(eq(projectTable.workspaceId, parsedInput.workspaceId))
          .then((res) => res[0].count),
      ])

      const response: ProjectDto[] = projects.map((project) => ({
        id: project.id,
        priority: project.priority,
        name: project.name,
        stage: project.stage,
        createdAt: project.createdAt,
        tags: [], // Temporarily return empty array until we fix the aggregation
      }))

      return { projects: response, filteredCount, totalCount }
    },
    Caching.createUserKeyParts(
      UserCacheKey.Projects,
      session.user.id,
      parsedInput.pageIndex.toString(),
      parsedInput.pageSize.toString(),
      parsedInput.sortBy,
      parsedInput.sortDirection,
      parsedInput.tags?.join(',') ?? '',
      `priority=${parsedInput.priority ?? ''}`,
      `searchQuery=${parsedInput.searchQuery ?? ''}`
    ),
    {
      revalidate: defaultRevalidateTimeInSeconds,
      tags: [Caching.createUserTag(UserCacheKey.Projects, session.user.id)],
    }
  )()
}

function getOrderBy(sortBy: string, sortDirection: SortDirection) {
  const direction = sortDirection === SortDirection.Asc ? asc : desc

  switch (sortBy) {
    case 'name':
      return direction(projectTable.name)
    case 'priority':
      return direction(projectTable.priority)
    case 'stage':
      return direction(projectTable.stage)
    case 'createdAt':
      return direction(projectTable.createdAt)
    default:
      return direction(projectTable.name)
  }
}
