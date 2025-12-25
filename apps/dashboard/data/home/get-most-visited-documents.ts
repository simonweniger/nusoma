import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';
import { endOfDay, startOfDay } from 'date-fns';

import { getAuthOrganizationContext } from '@workspace/auth/context';
import { ValidationError } from '@workspace/common/errors';
import { and, count, db, desc, eq, gte, lte } from '@workspace/database/client';
import {
  documentPageVisitTable,
  documentTable
} from '@workspace/database/schema';

import { Caching, OrganizationCacheKey } from '~/data/caching';
import {
  getMostVisitedDocumentsSchema,
  type GetMostVisitedDocumentsSchema
} from '~/schemas/home/get-most-vistied-documents-schema';
import type { VisitedDocumentDto } from '~/types/dtos/visited-document-dto';

async function getMostVisitedDocumentsData(
  organizationId: string,
  from: Date,
  to: Date
): Promise<VisitedDocumentDto[]> {
  'use cache';
  cacheLife('default');
  cacheTag(
    Caching.createOrganizationTag(
      OrganizationCacheKey.DocumentPageVisits,
      organizationId
    )
  );
  cacheTag(
    Caching.createOrganizationTag(
      OrganizationCacheKey.Documents,
      organizationId
    )
  );

  const pageVisits = count(documentPageVisitTable.id).as('pageVisits');

  const documents = await db
    .select({
      id: documentTable.id,
      name: documentTable.name,
      image: documentTable.image,
      record: documentTable.record,
      pageVisits
    })
    .from(documentTable)
    .leftJoin(
      documentPageVisitTable,
      and(
        eq(documentPageVisitTable.documentId, documentTable.id),
        gte(documentPageVisitTable.timestamp, startOfDay(from)),
        lte(documentPageVisitTable.timestamp, endOfDay(to))
      )
    )
    .where(eq(documentTable.organizationId, organizationId))
    .groupBy(
      documentTable.id,
      documentTable.name,
      documentTable.image,
      documentTable.record
    )
    .orderBy(desc(pageVisits))
    .limit(6);

  return documents.map((document) => ({
    id: document.id,
    name: document.name,
    image: document.image ?? undefined,
    record: document.record,
    pageVisits: Number(document.pageVisits)
  }));
}

export async function getMostVisitedDocuments(
  input: GetMostVisitedDocumentsSchema
): Promise<VisitedDocumentDto[]> {
  const ctx = await getAuthOrganizationContext();

  const result = getMostVisitedDocumentsSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(JSON.stringify(result.error.flatten()));
  }

  return getMostVisitedDocumentsData(
    ctx.organization.id,
    result.data.from,
    result.data.to
  );
}
