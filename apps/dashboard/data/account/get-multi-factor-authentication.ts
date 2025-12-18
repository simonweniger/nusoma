import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { getAuthContext } from '@workspace/auth/context';
import { db, eq } from '@workspace/database/client';
import { authenticatorAppTable } from '@workspace/database/schema';

import { Caching, UserCacheKey } from '~/data/caching';
import type { MultiFactorAuthenticationDto } from '~/types/dtos/multi-factor-authentication-dto';

async function getMultiFactorAuthenticationData(
  userId: string
): Promise<MultiFactorAuthenticationDto> {
  'use cache';
  cacheLife('default');
  cacheTag(Caching.createUserTag(UserCacheKey.MultiFactorAuthentication, userId));

  const [authenticatorApp] = await db
    .select({
      id: authenticatorAppTable.id,
      accountName: authenticatorAppTable.accountName,
      issuer: authenticatorAppTable.issuer,
      createdAt: authenticatorAppTable.createdAt
    })
    .from(authenticatorAppTable)
    .where(eq(authenticatorAppTable.userId, userId))
    .limit(1);

  return {
    authenticatorApp: authenticatorApp ?? undefined
  };
}

export async function getMultiFactorAuthentication(): Promise<MultiFactorAuthenticationDto> {
  const ctx = await getAuthContext();
  return getMultiFactorAuthenticationData(ctx.session.user.id);
}
