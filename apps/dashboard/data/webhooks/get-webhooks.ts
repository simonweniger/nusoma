import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { getAuthOrganizationContext } from '@workspace/auth/context';
import { asc, db, eq } from '@workspace/database/client';
import { webhookTable, type WebhookTrigger } from '@workspace/database/schema';

import { Caching, OrganizationCacheKey } from '~/data/caching';
import type { WebhookDto } from '~/types/dtos/webhook-dto';

async function getWebhooksData(organizationId: string): Promise<WebhookDto[]> {
  'use cache';
  cacheLife('default');
  cacheTag(
    Caching.createOrganizationTag(OrganizationCacheKey.Webhooks, organizationId)
  );

  const webhooks = await db
    .select({
      id: webhookTable.id,
      url: webhookTable.url,
      triggers: webhookTable.triggers,
      secret: webhookTable.secret
    })
    .from(webhookTable)
    .where(eq(webhookTable.organizationId, organizationId))
    .orderBy(asc(webhookTable.createdAt));

  return webhooks.map((webhook) => ({
    id: webhook.id,
    url: webhook.url,
    triggers: webhook.triggers as WebhookTrigger[],
    secret: webhook.secret ?? undefined
  }));
}

export async function getWebhooks(): Promise<WebhookDto[]> {
  const ctx = await getAuthOrganizationContext();
  return getWebhooksData(ctx.organization.id);
}
