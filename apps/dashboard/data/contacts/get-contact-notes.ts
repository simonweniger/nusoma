import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { getAuthOrganizationContext } from '@workspace/auth/context';
import { ValidationError } from '@workspace/common/errors';
import { and, asc, db, eq } from '@workspace/database/client';
import {
  contactNoteTable,
  contactTable,
  userTable
} from '@workspace/database/schema';

import { Caching, OrganizationCacheKey } from '~/data/caching';
import {
  getContactNotesSchema,
  type GetContactNotesSchema
} from '~/schemas/contacts/get-contact-notes-schema';
import type { ContactNoteDto } from '~/types/dtos/contact-note-dto';

async function getContactNotesData(
  organizationId: string,
  contactId: string
): Promise<ContactNoteDto[]> {
  'use cache';
  cacheLife('default');
  cacheTag(
    Caching.createOrganizationTag(
      OrganizationCacheKey.ContactNotes,
      organizationId,
      contactId
    )
  );
  cacheTag(
    Caching.createOrganizationTag(
      OrganizationCacheKey.Contact,
      organizationId,
      contactId
    )
  );
  cacheTag(
    Caching.createOrganizationTag(OrganizationCacheKey.Contacts, organizationId)
  );

  const contactNotes = await db
    .select({
      id: contactNoteTable.id,
      contactId: contactNoteTable.contactId,
      text: contactNoteTable.text,
      createdAt: contactNoteTable.createdAt,
      updatedAt: contactNoteTable.updatedAt,
      user: {
        id: userTable.id,
        name: userTable.name,
        image: userTable.image
      }
    })
    .from(contactNoteTable)
    .innerJoin(userTable, eq(contactNoteTable.userId, userTable.id))
    .innerJoin(contactTable, eq(contactNoteTable.contactId, contactTable.id))
    .where(
      and(
        eq(contactTable.organizationId, organizationId),
        eq(contactNoteTable.contactId, contactId)
      )
    )
    .orderBy(asc(contactNoteTable.createdAt));

  return contactNotes.map((note) => ({
    id: note.id,
    contactId: note.contactId,
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

export async function getContactNotes(
  input: GetContactNotesSchema
): Promise<ContactNoteDto[]> {
  const ctx = await getAuthOrganizationContext();

  const result = getContactNotesSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(JSON.stringify(result.error.flatten()));
  }

  return getContactNotesData(ctx.organization.id, result.data.contactId);
}
