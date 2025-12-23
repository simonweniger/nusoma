'use server';

import { updateTag } from 'next/cache';
import { startOfDay } from 'date-fns';

import { NotFoundError } from '@workspace/common/errors';
import { and, db, eq } from '@workspace/database/client';
import { apiKeyTable } from '@workspace/database/schema';

import { authOrganizationActionClient } from '~/actions/safe-action';
import { Caching, OrganizationCacheKey } from '~/data/caching';
import { updateApiKeySchema } from '~/schemas/api-keys/update-api-key-schema';

export const updateApiKey = authOrganizationActionClient
  .metadata({ actionName: 'updateApiKey' })
  .inputSchema(updateApiKeySchema)
  .action(async ({ parsedInput, ctx }) => {
    const [apiKey] = await db
      .select({})
      .from(apiKeyTable)
      .where(
        and(
          eq(apiKeyTable.id, parsedInput.id),
          eq(apiKeyTable.organizationId, ctx.organization.id)
        )
      )
      .limit(1);

    if (!apiKey) {
      throw new NotFoundError('API key not found');
    }

    await db
      .update(apiKeyTable)
      .set({
        description: parsedInput.description,
        expiresAt: parsedInput.neverExpires
          ? null
          : startOfDay(parsedInput.expiresAt ?? new Date())
      })
      .where(eq(apiKeyTable.id, parsedInput.id));

    updateTag(
      Caching.createOrganizationTag(
        OrganizationCacheKey.ApiKeys,
        ctx.organization.id
      )
    );
  });
