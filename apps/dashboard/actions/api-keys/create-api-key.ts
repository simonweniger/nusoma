'use server';

import { updateTag } from 'next/cache';
import { startOfDay } from 'date-fns';

import { generateApiKey } from '@workspace/api-keys/generate-api-key';
import { hashApiKey } from '@workspace/api-keys/hash-api-key';
import { db } from '@workspace/database/client';
import { apiKeyTable } from '@workspace/database/schema';

import { authOrganizationActionClient } from '~/actions/safe-action';
import { Caching, OrganizationCacheKey } from '~/data/caching';
import { createApiKeySchema } from '~/schemas/api-keys/create-api-key-schema';

export const createApiKey = authOrganizationActionClient
  .metadata({ actionName: 'createApiKey' })
  .inputSchema(createApiKeySchema)
  .action(async ({ parsedInput, ctx }) => {
    const unhashedKey = generateApiKey();

    await db.insert(apiKeyTable).values({
      description: parsedInput.description,
      hashedKey: hashApiKey(unhashedKey),
      expiresAt: parsedInput.neverExpires
        ? null
        : startOfDay(parsedInput.expiresAt ?? new Date()),
      organizationId: ctx.organization.id
    });

    updateTag(
      Caching.createOrganizationTag(
        OrganizationCacheKey.ApiKeys,
        ctx.organization.id
      )
    );

    return { apiKey: unhashedKey };
  });
