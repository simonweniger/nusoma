'use server';

import { updateTag } from 'next/cache';

import { db } from '@workspace/database/client';
import { documentCommentTable } from '@workspace/database/schema';

import { authOrganizationActionClient } from '~/actions/safe-action';
import { Caching, OrganizationCacheKey } from '~/data/caching';
import { addDocumentCommentSchema } from '~/schemas/documents/add-document-comment-schema';

export const addDocumentComment = authOrganizationActionClient
  .metadata({ actionName: 'addDocumentComment' })
  .inputSchema(addDocumentCommentSchema)
  .action(async ({ parsedInput, ctx }) => {
    await db.insert(documentCommentTable).values({
      documentId: parsedInput.documentId,
      text: parsedInput.text,
      userId: ctx.session.user.id
    });

    updateTag(
      Caching.createOrganizationTag(
        OrganizationCacheKey.DocumentTimelineEvents,
        ctx.organization.id,
        parsedInput.documentId
      )
    );
  });
