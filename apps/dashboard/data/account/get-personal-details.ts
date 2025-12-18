import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { getAuthContext } from '@workspace/auth/context';
import { NotFoundError } from '@workspace/common/errors';
import { db, eq } from '@workspace/database/client';
import { userTable } from '@workspace/database/schema';

import { Caching, UserCacheKey } from '~/data/caching';
import type { PersonalDetailsDto } from '~/types/dtos/personal-details-dto';

async function getPersonalDetailsData(userId: string): Promise<PersonalDetailsDto> {
  'use cache';
  cacheLife('default');
  cacheTag(Caching.createUserTag(UserCacheKey.PersonalDetails, userId));

  const [userFromDb] = await db
    .select({
      id: userTable.id,
      image: userTable.image,
      name: userTable.name,
      phone: userTable.phone,
      email: userTable.email
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  if (!userFromDb) {
    throw new NotFoundError('User not found');
  }

  return {
    id: userFromDb.id,
    image: userFromDb.image ?? undefined,
    name: userFromDb.name,
    phone: userFromDb.phone ?? undefined,
    email: userFromDb.email ?? undefined
  };
}

export async function getPersonalDetails(): Promise<PersonalDetailsDto> {
  const ctx = await getAuthContext();
  return getPersonalDetailsData(ctx.session.user.id);
}
