import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { getAuthOrganizationContext } from '@workspace/auth/context';
import { ValidationError } from '@workspace/common/errors';
import {
  and,
  asc,
  count,
  db,
  desc,
  eq,
  exists,
  inArray,
  jsonAggBuildObject,
  sql
} from '@workspace/database/client';
import {
  ContactRecord,
  contactTable,
  contactTagTable,
  contactToContactTagTable
} from '@workspace/database/schema';

import { Caching, OrganizationCacheKey } from '~/data/caching';
import {
  getContactsSchema,
  RecordsOption,
  type GetContactsSchema
} from '~/schemas/contacts/get-contacts-schema';
import type { ContactDto } from '~/types/dtos/contact-dto';
import { SortDirection } from '~/types/sort-direction';

type GetContactsResult = {
  contacts: ContactDto[];
  filteredCount: number;
  totalCount: number;
};

type SearchParams = {
  organizationId: string;
  pageIndex: number;
  pageSize: number;
  sortBy: string;
  sortDirection: string;
  tags: string[];
  records: RecordsOption;
  searchQuery?: string;
};

function mapRecords(option: RecordsOption): ContactRecord | undefined {
  switch (option) {
    case RecordsOption.People:
      return ContactRecord.PERSON;
    case RecordsOption.Companies:
      return ContactRecord.COMPANY;
  }
  return undefined;
}

async function getContactsData(
  params: SearchParams
): Promise<GetContactsResult> {
  'use cache';
  cacheLife('default');
  cacheTag(
    Caching.createOrganizationTag(
      OrganizationCacheKey.Contacts,
      params.organizationId
    )
  );

  const recordFilter = mapRecords(params.records);

  const whereClause = and(
    // Organization ID
    eq(contactTable.organizationId, params.organizationId),
    // Record Filter
    recordFilter ? eq(contactTable.record, recordFilter) : undefined,
    // Tags Filter
    params.tags?.length
      ? exists(
          db
            .select({})
            .from(contactToContactTagTable)
            .innerJoin(
              contactTagTable,
              eq(contactToContactTagTable.contactTagId, contactTagTable.id)
            )
            .where(
              and(
                eq(contactToContactTagTable.contactId, contactTable.id),
                inArray(contactTagTable.text, params.tags)
              )
            )
        )
      : undefined,
    // Search query
    params.searchQuery
      ? sql`(${contactTable.name} ILIKE ${'%' + params.searchQuery + '%'} OR ${
          contactTable.email
        } ILIKE ${'%' + params.searchQuery + '%'})`
      : undefined
  );

  const [contacts, filteredCount, totalCount] = await Promise.all([
    db
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
        eq(contactTable.id, contactToContactTagTable.contactId)
      )
      .leftJoin(
        contactTagTable,
        eq(contactToContactTagTable.contactTagId, contactTagTable.id)
      )
      .where(whereClause)
      .groupBy(contactTable.id)
      .limit(params.pageSize)
      .offset(params.pageIndex * params.pageSize)
      .orderBy(
        getOrderBy(params.sortBy, params.sortDirection as SortDirection)
      ),
    db
      .select({ count: count() })
      .from(contactTable)
      .where(whereClause)
      .then((res) => res[0].count),
    db
      .select({ count: count() })
      .from(contactTable)
      .where(eq(contactTable.organizationId, params.organizationId))
      .then((res) => res[0].count)
  ]);

  const mapped: ContactDto[] = contacts.map((contact) => ({
    id: contact.id,
    record: contact.record,
    image: contact.image ?? undefined,
    name: contact.name,
    email: contact.email ?? undefined,
    address: contact.address ?? undefined,
    phone: contact.phone ?? undefined,
    stage: contact.stage,
    createdAt: contact.createdAt,
    tags: contact.tags
  }));

  return { contacts: mapped, filteredCount, totalCount };
}

function getOrderBy(sortBy: string, sortDirection: SortDirection) {
  const direction = sortDirection === SortDirection.Asc ? asc : desc;

  switch (sortBy) {
    case 'name':
      return direction(contactTable.name);
    case 'email':
      return direction(contactTable.email);
    case 'address':
      return direction(contactTable.address);
    case 'phone':
      return direction(contactTable.phone);
    case 'stage':
      return direction(contactTable.stage);
    case 'createdAt':
      return direction(contactTable.createdAt);
    default:
      return direction(contactTable.name);
  }
}

export async function getContacts(
  input: GetContactsSchema
): Promise<GetContactsResult> {
  const ctx = await getAuthOrganizationContext();

  const result = getContactsSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(JSON.stringify(result.error.flatten()));
  }
  const parsedInput = result.data;

  return getContactsData({
    organizationId: ctx.organization.id,
    pageIndex: parsedInput.pageIndex,
    pageSize: parsedInput.pageSize,
    sortBy: parsedInput.sortBy,
    sortDirection: parsedInput.sortDirection,
    tags: parsedInput.tags,
    records: parsedInput.records,
    searchQuery: parsedInput.searchQuery
  });
}
