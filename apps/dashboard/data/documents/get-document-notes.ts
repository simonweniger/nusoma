import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { getAuthOrganizationContext } from '@workspace/auth/context';
import { ValidationError } from '@workspace/common/errors';
import { and, asc, db, eq } from '@workspace/database/client';
import {
  documentNoteTable,
  documentTable,
  userTable
} from '@workspace/database/schema';

import { Caching, OrganizationCacheKey } from '~/data/caching';
import {
  getDocumentNotesSchema,
  type GetDocumentNotesSchema
} from '~/schemas/documents/get-document-notes-schema';
import type { DocumentNoteDto } from '~/types/dtos/document-note-dto';

async function getDocumentNotesData(
  organizationId: string,
  documentId: string
): Promise<DocumentNoteDto[]> {
  'use cache';
  cacheLife('default');
  cacheTag(
    Caching.createOrganizationTag(
      OrganizationCacheKey.DocumentNotes,
      organizationId,
      documentId
    )
  );
  cacheTag(
    Caching.createOrganizationTag(
      OrganizationCacheKey.Document,
      organizationId,
      documentId
    )
  );
  cacheTag(
    Caching.createOrganizationTag(
      OrganizationCacheKey.Documents,
      organizationId
    )
  );

  const documentNotes = await db
    .select({
      id: documentNoteTable.id,
      documentId: documentNoteTable.documentId,
      text: documentNoteTable.text,
      createdAt: documentNoteTable.createdAt,
      updatedAt: documentNoteTable.updatedAt,
      user: {
        id: userTable.id,
        name: userTable.name,
        image: userTable.image
      }
    })
    .from(documentNoteTable)
    .innerJoin(userTable, eq(documentNoteTable.userId, userTable.id))
    .innerJoin(
      documentTable,
      eq(documentNoteTable.documentId, documentTable.id)
    )
    .where(
      and(
        eq(documentTable.organizationId, organizationId),
        eq(documentNoteTable.documentId, documentId)
      )
    )
    .orderBy(asc(documentNoteTable.createdAt));

  return documentNotes.map((note) => ({
    id: note.id,
    documentId: note.documentId,
    text: note.text ?? undefined,
    edited: note.createdAt.getTime() !== note.updatedAt.getTime(),
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    sender: {
      id: note.user.id,
      name: note.user.name,
      image: note.user.image ?? undefined
    }
  }));
}

export async function getDocumentNotes(
  input: GetDocumentNotesSchema
): Promise<DocumentNoteDto[]> {
  const ctx = await getAuthOrganizationContext();

  const result = getDocumentNotesSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(JSON.stringify(result.error.flatten()));
  }

  return getDocumentNotesData(ctx.organization.id, result.data.documentId);
}
