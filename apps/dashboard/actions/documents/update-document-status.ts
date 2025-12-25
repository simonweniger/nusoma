'use server';

import { updateTag } from 'next/cache';

import { NotFoundError } from '@workspace/common/errors';
import { and, db, eq } from '@workspace/database/client';
import { documentTable } from '@workspace/database/schema';

import { updateDocumentAndCaptureEvent } from '~/actions/documents/_document-event-capture';
import { authOrganizationActionClient } from '~/actions/safe-action';
import { Caching, OrganizationCacheKey } from '~/data/caching';
import { updateDocumentStageSchema } from '~/schemas/documents/update-document-stage-schema';

export const updateDocumentStage = authOrganizationActionClient
  .metadata({ actionName: 'updateDocumentStage' })
  .inputSchema(updateDocumentStageSchema)
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
      { stage: parsedInput.stage },
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
  });
