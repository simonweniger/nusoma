'use server';

import { updateTag } from 'next/cache';

import { NotFoundError } from '@workspace/common/errors';
import { and, db, eq } from '@workspace/database/client';
import { documentNoteTable, documentTable } from '@workspace/database/schema';

import { authOrganizationActionClient } from '~/actions/safe-action';
import { Caching, OrganizationCacheKey } from '~/data/caching';
import { updateDocumentCommentSchema } from '~/schemas/documents/update-document-comment-schema';

export const updateDocumentNote = authOrganizationActionClient
  .metadata({ actionName: 'updateDocumentNote' })
  .inputSchema(updateDocumentCommentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const [documentNote] = await db
      .select({})
      .from(documentNoteTable)
      .innerJoin(
        documentTable,
        eq(documentNoteTable.documentId, documentTable.id)
      )
      .where(
        and(
          eq(documentTable.organizationId, ctx.organization.id),
          eq(documentNoteTable.id, parsedInput.id)
        )
      )
      .limit(1);

    if (!documentNote) {
      throw new NotFoundError('Document not not found');
    }

    await db
      .update(documentNoteTable)
      .set({ text: parsedInput.text })
      .where(eq(documentNoteTable.id, parsedInput.id))
      .returning({ documentId: documentNoteTable.documentId });

    updateTag(
      Caching.createOrganizationTag(
        OrganizationCacheKey.DocumentNotes,
        ctx.organization.id,
        parsedInput.id
      )
    );
  });
