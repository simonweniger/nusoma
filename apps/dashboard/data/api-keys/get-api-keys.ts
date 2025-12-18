import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { getAuthOrganizationContext } from '@workspace/auth/context';
import { asc, db, eq } from '@workspace/database/client';
import { apiKeyTable } from '@workspace/database/schema';

import { Caching, OrganizationCacheKey } from '~/data/caching';
import type { ApiKeyDto } from '~/types/dtos/api-key-dto';

async function getApiKeysData(organizationId: string): Promise<ApiKeyDto[]> {
  'use cache';
  cacheLife('default');
  cacheTag(
    Caching.createOrganizationTag(OrganizationCacheKey.ApiKeys, organizationId)
  );

  const apiKeys = await db
    .select({
      id: apiKeyTable.id,
      description: apiKeyTable.description,
      lastUsedAt: apiKeyTable.lastUsedAt,
      expiresAt: apiKeyTable.expiresAt
    })
    .from(apiKeyTable)
    .where(eq(apiKeyTable.organizationId, organizationId))
    .orderBy(asc(apiKeyTable.createdAt));

  return apiKeys.map((apiKey) => ({
    id: apiKey.id,
    description: apiKey.description,
    lastUsedAt: apiKey.lastUsedAt ?? undefined,
    expiresAt: apiKey.expiresAt ?? undefined
  }));
}

export async function getApiKeys(): Promise<ApiKeyDto[]> {
  const ctx = await getAuthOrganizationContext();
  return getApiKeysData(ctx.organization.id);
}
