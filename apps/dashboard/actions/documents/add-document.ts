'use server';

import { updateTag } from 'next/cache';

import { DocumentStage } from '@workspace/database/schema';

import { createDocumentAndCaptureEvent } from '~/actions/documents/_document-event-capture';
import { authOrganizationActionClient } from '~/actions/safe-action';
import { Caching, OrganizationCacheKey } from '~/data/caching';
import { addDocumentSchema } from '~/schemas/documents/add-document-schema';

export const addDocument = authOrganizationActionClient
  .metadata({ actionName: 'addDocument' })
  .inputSchema(addDocumentSchema)
  .action(async ({ parsedInput, ctx }) => {
    await createDocumentAndCaptureEvent(
      {
        record: parsedInput.record,
        name: parsedInput.name,
        email: parsedInput.email ? parsedInput.email : null,
        phone: parsedInput.phone ? parsedInput.phone : null,
        organizationId: ctx.organization.id,
        address: null,
        image: null,
        stage: DocumentStage.LEAD
      },
      ctx.session.user.id
    );

    updateTag(
      Caching.createOrganizationTag(
        OrganizationCacheKey.Documents,
        ctx.organization.id
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
