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
  DocumentRecord,
  documentTable,
  documentTagTable,
  documentToDocumentTagTable
} from '@workspace/database/schema';

import { Caching, OrganizationCacheKey } from '~/data/caching';
import {
  getDocumentsSchema,
  RecordsOption,
  type GetDocumentsSchema
} from '~/schemas/documents/get-documents-schema';
import type { DocumentDto } from '~/types/dtos/document-dto';
import { SortDirection } from '~/types/sort-direction';

type GetDocumentsResult = {
  documents: DocumentDto[];
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

function mapRecords(option: RecordsOption): DocumentRecord | undefined {
  switch (option) {
    case RecordsOption.People:
      return DocumentRecord.PERSON;
    case RecordsOption.Companies:
      return DocumentRecord.COMPANY;
  }
  return undefined;
}

async function getDocumentsData(
  params: SearchParams
): Promise<GetDocumentsResult> {
  'use cache';
  cacheLife('default');
  cacheTag(
    Caching.createOrganizationTag(
      OrganizationCacheKey.Documents,
      params.organizationId
    )
  );

  const recordFilter = mapRecords(params.records);

  const whereClause = and(
    // Organization ID
    eq(documentTable.organizationId, params.organizationId),
    // Record Filter
    recordFilter ? eq(documentTable.record, recordFilter) : undefined,
    // Tags Filter
    params.tags?.length
      ? exists(
          db
            .select({})
            .from(documentToDocumentTagTable)
            .innerJoin(
              documentTagTable,
              eq(documentToDocumentTagTable.documentTagId, documentTagTable.id)
            )
            .where(
              and(
                eq(documentToDocumentTagTable.documentId, documentTable.id),
                inArray(documentTagTable.text, params.tags)
              )
            )
        )
      : undefined,
    // Search query
    params.searchQuery
      ? sql`(${documentTable.name} ILIKE ${'%' + params.searchQuery + '%'} OR ${
          documentTable.email
        } ILIKE ${'%' + params.searchQuery + '%'})`
      : undefined
  );

  const [documents, filteredCount, totalCount] = await Promise.all([
    db
      .select({
        id: documentTable.id,
        record: documentTable.record,
        image: documentTable.image,
        name: documentTable.name,
        email: documentTable.email,
        address: documentTable.address,
        phone: documentTable.phone,
        stage: documentTable.stage,
        createdAt: documentTable.createdAt,
        tags: jsonAggBuildObject({
          id: documentTagTable.id,
          text: documentTagTable.text
        })
      })
      .from(documentTable)
      .leftJoin(
        documentToDocumentTagTable,
        eq(documentTable.id, documentToDocumentTagTable.documentId)
      )
      .leftJoin(
        documentTagTable,
        eq(documentToDocumentTagTable.documentTagId, documentTagTable.id)
      )
      .where(whereClause)
      .groupBy(documentTable.id)
      .limit(params.pageSize)
      .offset(params.pageIndex * params.pageSize)
      .orderBy(
        getOrderBy(params.sortBy, params.sortDirection as SortDirection)
      ),
    db
      .select({ count: count() })
      .from(documentTable)
      .where(whereClause)
      .then((res) => res[0].count),
    db
      .select({ count: count() })
      .from(documentTable)
      .where(eq(documentTable.organizationId, params.organizationId))
      .then((res) => res[0].count)
  ]);

  const mapped: DocumentDto[] = documents.map((document) => ({
    id: document.id,
    record: document.record,
    image: document.image ?? undefined,
    name: document.name,
    email: document.email ?? undefined,
    address: document.address ?? undefined,
    phone: document.phone ?? undefined,
    stage: document.stage,
    createdAt: document.createdAt,
    tags: document.tags
  }));

  return { documents: mapped, filteredCount, totalCount };
}

function getOrderBy(sortBy: string, sortDirection: SortDirection) {
  const direction = sortDirection === SortDirection.Asc ? asc : desc;

  switch (sortBy) {
    case 'name':
      return direction(documentTable.name);
    case 'email':
      return direction(documentTable.email);
    case 'address':
      return direction(documentTable.address);
    case 'phone':
      return direction(documentTable.phone);
    case 'stage':
      return direction(documentTable.stage);
    case 'createdAt':
      return direction(documentTable.createdAt);
    default:
      return direction(documentTable.name);
  }
}

export async function getDocuments(
  input: GetDocumentsSchema
): Promise<GetDocumentsResult> {
  const ctx = await getAuthOrganizationContext();

  const result = getDocumentsSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(JSON.stringify(result.error.flatten()));
  }
  const parsedInput = result.data;

  return getDocumentsData({
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
