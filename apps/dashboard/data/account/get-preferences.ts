import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { getAuthContext } from '@workspace/auth/context';
import { NotFoundError } from '@workspace/common/errors';
import { db, eq } from '@workspace/database/client';
import { userTable } from '@workspace/database/schema';

import { Caching, UserCacheKey } from '~/data/caching';
import type { PreferencesDto } from '~/types/dtos/preferences-dto';

async function getPreferencesData(userId: string): Promise<PreferencesDto> {
  'use cache';
  cacheLife('default');
  cacheTag(Caching.createUserTag(UserCacheKey.Preferences, userId));

  const [userFromDb] = await db
    .select({
      locale: userTable.locale
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  if (!userFromDb) {
    throw new NotFoundError('User not found');
  }

  return {
    locale: userFromDb.locale
  };
}

export async function getPreferences(): Promise<PreferencesDto> {
  const ctx = await getAuthContext();
  return getPreferencesData(ctx.session.user.id);
}
