'use server';

import { updateTag } from 'next/cache';

import { NotFoundError } from '@workspace/common/errors';
import { and, db, eq } from '@workspace/database/client';
import { documentNoteTable, documentTable } from '@workspace/database/schema';

import { authOrganizationActionClient } from '~/actions/safe-action';
import { Caching, OrganizationCacheKey } from '~/data/caching';
import { deleteDocumentNoteSchema } from '~/schemas/documents/delete-document-note-schema';

export const deleteDocumentNote = authOrganizationActionClient
  .metadata({ actionName: 'deleteDocumentNote' })
  .inputSchema(deleteDocumentNoteSchema)
  .action(async ({ parsedInput, ctx }) => {
    const [documentNote] = await db
      .select({
        documentId: documentNoteTable.documentId
      })
      .from(documentNoteTable)
      .innerJoin(
        documentTable,
        eq(documentNoteTable.documentId, documentTable.id)
      )
      .where(
        and(
          eq(documentNoteTable.id, parsedInput.id),
          eq(documentTable.organizationId, ctx.organization.id)
        )
      )
      .limit(1);

    if (!documentNote) {
      throw new NotFoundError('Note not found');
    }

    await db
      .delete(documentNoteTable)
      .where(eq(documentNoteTable.id, parsedInput.id));

    updateTag(
      Caching.createOrganizationTag(
        OrganizationCacheKey.DocumentNotes,
        ctx.organization.id,
        documentNote.documentId
      )
    );
  });
