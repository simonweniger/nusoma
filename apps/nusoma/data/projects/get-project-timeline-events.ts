import { and, eq, inArray } from 'drizzle-orm'
import { unstable_cache as cache } from 'next/cache'
import 'server-only'
import { db } from '@nusoma/database'
import {
  ActorType,
  projectActivity as projectActivityTable,
  project as projectTable,
  user,
} from '@nusoma/database/schema'
import type {
  ActivityTimelineEventDto,
  TimelineEventDto,
} from '@nusoma/types/dtos/timeline-event-dto'
import { getSession } from '@/lib/auth-server'
import { ValidationError } from '@/lib/errors'
import { Caching, defaultRevalidateTimeInSeconds, UserCacheKey } from '@/caching'
import {
  type GetProjectTimelineEventsSchema,
  getProjectTimelineEventsSchema,
} from '@/schemas/projects/get-project-timeline-events-schema'

export async function getProjectTimelineEvents(
  input: GetProjectTimelineEventsSchema
): Promise<TimelineEventDto[]> {
  const session = await getSession()

  if (!session || !session.user?.id) {
    throw new ValidationError('User not authenticated')
  }

  const result = getProjectTimelineEventsSchema.safeParse(input)
  if (!result.success) {
    throw new ValidationError(JSON.stringify(result.error.flatten()))
  }
  const parsedInput = result.data

  return cache(
    async () => {
      const activities = await db
        .select({
          id: projectActivityTable.id,
          projectId: projectActivityTable.projectId,
          actionType: projectActivityTable.actionType,
          actorType: projectActivityTable.actorType,
          actorId: projectActivityTable.actorId,
          metadata: projectActivityTable.metadata,
          occurredAt: projectActivityTable.occurredAt,
        })
        .from(projectActivityTable)
        .innerJoin(projectTable, eq(projectActivityTable.projectId, projectTable.id))
        .where(
          and(
            //eq(projectTable.workspaceId, parsedInput.workspaceId),
            eq(projectActivityTable.projectId, parsedInput.projectId)
          )
        )

      const actorIds = [
        ...new Set(
          activities
            .filter((activity) => activity.actorType === ActorType.MEMBER)
            .map((activity) => activity.actorId)
        ),
      ]
      const actors = await db
        .select({
          id: user.id,
          name: user.name,
          image: user.image,
        })
        .from(user)
        .where(inArray(user.id, actorIds))

      const mappedActivities: ActivityTimelineEventDto[] = activities.map((activity) => {
        const actor = actors.find((actor) => actor.id === activity.actorId)
        return {
          id: activity.id,
          projectId: activity.projectId,
          type: 'activity',
          actionType: activity.actionType,
          actorType: activity.actorType,
          metadata: activity.metadata,
          occurredAt: activity.occurredAt,
          actor: {
            id: actor?.id ?? '',
            name: actor?.name ?? '',
            image: actor?.image ?? undefined,
          },
        }
      })

      const sorted: TimelineEventDto[] = [...mappedActivities].sort((a, b) => {
        const dateA = a.occurredAt.getTime()
        const dateB = b.occurredAt.getTime()
        return dateB - dateA
      })

      return sorted
    },
    Caching.createUserKeyParts(
      UserCacheKey.ProjectTimelineEvents,
      session.user.id,
      parsedInput.projectId
    ),
    {
      revalidate: defaultRevalidateTimeInSeconds,
      tags: [
        Caching.createUserTag(
          UserCacheKey.ProjectTimelineEvents,
          session.user.id,
          parsedInput.projectId
        ),
        Caching.createUserTag(UserCacheKey.Project, session.user.id, parsedInput.projectId),
        Caching.createUserTag(UserCacheKey.Projects, session.user.id),
      ],
    }
  )()
}
