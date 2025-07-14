import { and, eq } from 'drizzle-orm'
import { unstable_cache as cache } from 'next/cache'
import 'server-only'
import { db } from '@nusoma/database'
import { favorite as favoriteTable } from '@nusoma/database/schema'
import { getSession } from '@/lib/auth-server'
import { ValidationError } from '@/lib/errors'
import { Caching, defaultRevalidateTimeInSeconds, UserCacheKey } from '@/caching'
import {
  type GetProjectAddedToFavoritesSchema,
  getProjectIsInFavoritesSchema,
} from '@/schemas/projects/get-project-is-in-favorites-schema'

export async function getProjectIsInFavorites(
  input: GetProjectAddedToFavoritesSchema
): Promise<boolean> {
  const session = await getSession()

  if (!session || !session.user?.id) {
    throw new ValidationError('User not authenticated')
  }

  const result = getProjectIsInFavoritesSchema.safeParse(input)
  if (!result.success) {
    throw new ValidationError(JSON.stringify(result.error.flatten()))
  }
  const parsedInput = result.data

  return cache(
    async () => {
      const [favorite] = await db
        .select({})
        .from(favoriteTable)
        .where(
          and(
            eq(favoriteTable.userId, session.user.id),
            eq(favoriteTable.projectId, parsedInput.projectId)
          )
        )
        .limit(1)

      return !!favorite
    },
    Caching.createUserKeyParts(
      UserCacheKey.ProjectIsInFavorites,
      session.user.id,
      parsedInput.projectId
    ),
    {
      revalidate: defaultRevalidateTimeInSeconds,
      tags: [
        Caching.createUserTag(
          UserCacheKey.ProjectIsInFavorites,
          session.user.id,
          parsedInput.projectId
        ),
        Caching.createUserTag(UserCacheKey.Favorites, session.user.id, parsedInput.projectId),
      ],
    }
  )()
}
