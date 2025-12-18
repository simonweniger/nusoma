import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';
import { endOfDay, startOfDay } from 'date-fns';

import { getAuthOrganizationContext } from '@workspace/auth/context';
import { ValidationError } from '@workspace/common/errors';
import { and, count, db, desc, eq, gte, lte } from '@workspace/database/client';
import {
  contactPageVisitTable,
  contactTable
} from '@workspace/database/schema';

import { Caching, OrganizationCacheKey } from '~/data/caching';
import {
  getMostVisitedContactsSchema,
  type GetMostVisitedContactsSchema
} from '~/schemas/home/get-most-vistied-contacts-schema';
import type { VisitedContactDto } from '~/types/dtos/visited-contact-dto';

async function getMostVisitedContactsData(
  organizationId: string,
  from: Date,
  to: Date
): Promise<VisitedContactDto[]> {
  'use cache';
  cacheLife('default');
  cacheTag(
    Caching.createOrganizationTag(
      OrganizationCacheKey.ContactPageVisits,
      organizationId
    )
  );
  cacheTag(
    Caching.createOrganizationTag(OrganizationCacheKey.Contacts, organizationId)
  );

  const pageVisits = count(contactPageVisitTable.id).as('pageVisits');

  const contacts = await db
    .select({
      id: contactTable.id,
      name: contactTable.name,
      image: contactTable.image,
      record: contactTable.record,
      pageVisits
    })
    .from(contactTable)
    .leftJoin(
      contactPageVisitTable,
      and(
        eq(contactPageVisitTable.contactId, contactTable.id),
        gte(contactPageVisitTable.timestamp, startOfDay(from)),
        lte(contactPageVisitTable.timestamp, endOfDay(to))
      )
    )
    .where(eq(contactTable.organizationId, organizationId))
    .groupBy(
      contactTable.id,
      contactTable.name,
      contactTable.image,
      contactTable.record
    )
    .orderBy(desc(pageVisits))
    .limit(6);

  return contacts.map((contact) => ({
    id: contact.id,
    name: contact.name,
    image: contact.image ?? undefined,
    record: contact.record,
    pageVisits: Number(contact.pageVisits)
  }));
}

export async function getMostVisitedContacts(
  input: GetMostVisitedContactsSchema
): Promise<VisitedContactDto[]> {
  const ctx = await getAuthOrganizationContext();

  const result = getMostVisitedContactsSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(JSON.stringify(result.error.flatten()));
  }

  return getMostVisitedContactsData(
    ctx.organization.id,
    result.data.from,
    result.data.to
  );
}
