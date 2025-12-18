import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';

import { getAuthOrganizationContext } from '@workspace/auth/context';
import { ValidationError } from '@workspace/common/errors';
import { and, db, eq, jsonAggBuildObject } from '@workspace/database/client';
import {
  contactTable,
  contactTagTable,
  contactToContactTagTable
} from '@workspace/database/schema';

import { Caching, OrganizationCacheKey } from '~/data/caching';
import {
  getContactSchema,
  type GetContactSchema
} from '~/schemas/contacts/get-contact-schema';
import type { ContactDto } from '~/types/dtos/contact-dto';

async function getContactData(
  organizationId: string,
  contactId: string
): Promise<ContactDto> {
  'use cache';
  cacheLife('default');
  cacheTag(
    Caching.createOrganizationTag(
      OrganizationCacheKey.Contact,
      organizationId,
      contactId
    )
  );

  const [contact] = await db
    .select({
      id: contactTable.id,
      record: contactTable.record,
      image: contactTable.image,
      name: contactTable.name,
      email: contactTable.email,
      address: contactTable.address,
      phone: contactTable.phone,
      stage: contactTable.stage,
      createdAt: contactTable.createdAt,
      tags: jsonAggBuildObject({
        id: contactTagTable.id,
        text: contactTagTable.text
      })
    })
    .from(contactTable)
    .leftJoin(
      contactToContactTagTable,
      eq(contactToContactTagTable.contactId, contactTable.id)
    )
    .leftJoin(
      contactTagTable,
      eq(contactTagTable.id, contactToContactTagTable.contactTagId)
    )
    .where(
      and(
        eq(contactTable.organizationId, organizationId),
        eq(contactTable.id, contactId)
      )
    )
    .groupBy(
      contactTable.id,
      contactTable.record,
      contactTable.image,
      contactTable.name,
      contactTable.email,
      contactTable.address,
      contactTable.phone,
      contactTable.stage,
      contactTable.createdAt
    );

  if (!contact) {
    return notFound();
  }

  return {
    id: contact.id,
    record: contact.record,
    image: contact.image ?? undefined,
    name: contact.name,
    email: contact.email ?? undefined,
    address: contact.address ?? undefined,
    phone: contact.phone ?? undefined,
    stage: contact.stage,
    createdAt: contact.createdAt,
    tags: contact.tags ?? []
  };
}

export async function getContact(input: GetContactSchema): Promise<ContactDto> {
  const ctx = await getAuthOrganizationContext();

  const result = getContactSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(JSON.stringify(result.error.flatten()));
  }

  return getContactData(ctx.organization.id, result.data.id);
}
