'use server';

import { updateTag } from 'next/cache';

import { db } from '@workspace/database/client';
import { documentNoteTable } from '@workspace/database/schema';

import { authOrganizationActionClient } from '~/actions/safe-action';
import { Caching, OrganizationCacheKey } from '~/data/caching';
import { addDocumentNoteSchema } from '~/schemas/documents/add-document-note-schema';

export const addDocumentNote = authOrganizationActionClient
  .metadata({ actionName: 'addDocumentNote' })
  .inputSchema(addDocumentNoteSchema)
  .action(async ({ parsedInput, ctx }) => {
    await db.insert(documentNoteTable).values({
      documentId: parsedInput.documentId,
      text: parsedInput.text ?? undefined,
      userId: ctx.session.user.id
    });

    updateTag(
      Caching.createOrganizationTag(
        OrganizationCacheKey.DocumentNotes,
        ctx.organization.id,
        parsedInput.documentId
      )
    );
  });
