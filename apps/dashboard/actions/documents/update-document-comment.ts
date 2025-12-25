'use server';

import { updateTag } from 'next/cache';

import { NotFoundError } from '@workspace/common/errors';
import { and, db, eq } from '@workspace/database/client';
import {
  documentCommentTable,
  documentTable
} from '@workspace/database/schema';

import { authOrganizationActionClient } from '~/actions/safe-action';
import { Caching, OrganizationCacheKey } from '~/data/caching';
import { updateDocumentCommentSchema } from '~/schemas/documents/update-document-comment-schema';

export const updateDocumentComment = authOrganizationActionClient
  .metadata({ actionName: 'updateDocumentComment' })
  .inputSchema(updateDocumentCommentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const [documentComment] = await db
      .select({})
      .from(documentCommentTable)
      .innerJoin(
        documentTable,
        eq(documentCommentTable.documentId, documentTable.id)
      )
      .where(
        and(
          eq(documentTable.organizationId, ctx.organization.id),
          eq(documentCommentTable.id, parsedInput.id)
        )
      )
      .limit(1);

    if (!documentComment) {
      throw new NotFoundError('Document comment not found');
    }

    const [comment] = await db
      .update(documentCommentTable)
      .set({ text: parsedInput.text })
      .where(eq(documentCommentTable.id, parsedInput.id))
      .returning({ documentId: documentCommentTable.documentId });

    updateTag(
      Caching.createOrganizationTag(
        OrganizationCacheKey.DocumentTimelineEvents,
        ctx.organization.id,
        comment.documentId
      )
    );
  });
