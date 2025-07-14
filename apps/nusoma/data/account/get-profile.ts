import { db } from '@nusoma/database'
import { user, WorkspaceMemberRole } from '@nusoma/database/schema'
import type { ProfileDto } from '@nusoma/types/dtos/profile-dto'
import { eq } from 'drizzle-orm'
import { unstable_cache as cache } from 'next/cache'
import { getSession } from '@/lib/auth-server'
import { NotFoundError } from '@/lib/errors'
import { Caching, defaultRevalidateTimeInSeconds, UserCacheKey } from '@/caching'

export async function getProfile(): Promise<ProfileDto> {
  const ctx = await getSession()

  if (!ctx) {
    throw new NotFoundError('Session not found')
  }

  // const activeMembership = ctx.session.user.memberships.find(
  //   (m) => m.organizationId === ctx.organization.id
  // )
  // if (!activeMembership) {
  //   throw new ForbiddenError('User is not a member of this organization')
  // }

  return cache(
    async () => {
      const [userFromDb] = await db
        .select({
          id: user.id,
          image: user.image,
          name: user.name,
          email: user.email,
          locale: user.locale,
        })
        .from(user)
        .where(eq(user.id, ctx.user.id))
        .limit(1)

      if (!userFromDb) {
        throw new NotFoundError('User not found')
      }

      const response: Omit<ProfileDto, 'role' | 'isOwner'> = {
        id: userFromDb.id,
        image: userFromDb.image ?? undefined,
        name: userFromDb.name,
      }

      return response
    },
    Caching.createUserKeyParts(UserCacheKey.Profile, ctx.user.id),
    {
      revalidate: defaultRevalidateTimeInSeconds,
      tags: [
        Caching.createUserTag(UserCacheKey.Profile, ctx.user.id),
        //Caching.createUserTag(UserCacheKey.PersonalDetails, ctx.session.user.id),
        Caching.createUserTag(UserCacheKey.Preferences, ctx.user.id),
      ],
    }
  )().then((profile) => ({
    ...profile,
    // We don't want to cache these two fields
    isOwner: false, // Default value, should be updated with actual value
    role: WorkspaceMemberRole.MEMBER, // Default value, should be updated with actual value
  }))
}
