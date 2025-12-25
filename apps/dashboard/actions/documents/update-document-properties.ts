'use server';

import { updateTag } from 'next/cache';

import { NotFoundError } from '@workspace/common/errors';
import { and, db, eq } from '@workspace/database/client';
import { documentTable } from '@workspace/database/schema';

import { updateDocumentAndCaptureEvent } from '~/actions/documents/_document-event-capture';
import { authOrganizationActionClient } from '~/actions/safe-action';
import { Caching, OrganizationCacheKey } from '~/data/caching';
import { updateDocumentPropertiesSchema } from '~/schemas/documents/update-document-properties-schema';

export const updateDocumentProperties = authOrganizationActionClient
  .metadata({ actionName: 'updateDocumentProperties' })
  .inputSchema(updateDocumentPropertiesSchema)
  .action(async ({ parsedInput, ctx }) => {
    const [document] = await db
      .select({})
      .from(documentTable)
      .where(
        and(
          eq(documentTable.organizationId, ctx.organization.id),
          eq(documentTable.id, parsedInput.id)
        )
      )
      .limit(1);

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    await updateDocumentAndCaptureEvent(
      parsedInput.id,
      {
        record: parsedInput.record,
        name: parsedInput.name,
        email: parsedInput.email ? parsedInput.email : null,
        address: parsedInput.address ? parsedInput.address : null,
        phone: parsedInput.phone ? parsedInput.phone : null
      },
      ctx.session.user.id
    );

    updateTag(
      Caching.createOrganizationTag(
        OrganizationCacheKey.Documents,
        ctx.organization.id
      )
    );
    updateTag(
      Caching.createOrganizationTag(
        OrganizationCacheKey.Document,
        ctx.organization.id,
        parsedInput.id
      )
    );

    for (const membership of ctx.organization.memberships) {
      updateTag(
        Caching.createOrganizationTag(
          OrganizationCacheKey.Favorites,
          ctx.organization.id,
          membership.userId
        )
      );
    }
  });
