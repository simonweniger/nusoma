import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { getAuthContext } from '@workspace/auth/context';
import { NotFoundError } from '@workspace/common/errors';
import { db, eq } from '@workspace/database/client';
import { userTable } from '@workspace/database/schema';

import { Caching, UserCacheKey } from '~/data/caching';
import type { MarketingEmailsDto } from '~/types/dtos/marketing-emails-dto';

async function getMarketingEmailSettingsData(userId: string): Promise<MarketingEmailsDto> {
  'use cache';
  cacheLife('default');
  cacheTag(Caching.createUserTag(UserCacheKey.MarketingEmails, userId));

  const [userFromDb] = await db
    .select({
      enabledNewsletter: userTable.enabledNewsletter,
      enabledProductUpdates: userTable.enabledProductUpdates
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  if (!userFromDb) {
    throw new NotFoundError('User not found');
  }

  return {
    enabledNewsletter: userFromDb.enabledNewsletter,
    enabledProductUpdates: userFromDb.enabledProductUpdates
  };
}

export async function getMarketingEmailSettings(): Promise<MarketingEmailsDto> {
  const ctx = await getAuthContext();
  return getMarketingEmailSettingsData(ctx.session.user.id);
}
