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
import { deleteDocumentCommentSchema } from '~/schemas/documents/delete-document-comment-schema';

export const deleteDocumentComment = authOrganizationActionClient
  .metadata({ actionName: 'deleteDocumentComment' })
  .inputSchema(deleteDocumentCommentSchema)
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

    const comment = await db
      .delete(documentCommentTable)
      .where(eq(documentCommentTable.id, parsedInput.id))
      .returning({ documentId: documentCommentTable.documentId });

    if (comment.length > 0) {
      updateTag(
        Caching.createOrganizationTag(
          OrganizationCacheKey.DocumentTimelineEvents,
          ctx.organization.id,
          comment[0].documentId
        )
      );
    }
  });
