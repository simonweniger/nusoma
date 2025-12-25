import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';

import { getAuthOrganizationContext } from '@workspace/auth/context';
import { ValidationError } from '@workspace/common/errors';
import { and, db, eq, jsonAggBuildObject } from '@workspace/database/client';
import {
  documentTable,
  documentTagTable,
  documentToDocumentTagTable
} from '@workspace/database/schema';

import { Caching, OrganizationCacheKey } from '~/data/caching';
import {
  getDocumentSchema,
  type GetDocumentSchema
} from '~/schemas/documents/get-document-schema';
import type { DocumentDto } from '~/types/dtos/document-dto';

async function getDocumentData(
  organizationId: string,
  documentId: string
): Promise<DocumentDto> {
  'use cache';
  cacheLife('default');
  cacheTag(
    Caching.createOrganizationTag(
      OrganizationCacheKey.Document,
      organizationId,
      documentId
    )
  );

  const [document] = await db
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
      eq(documentToDocumentTagTable.documentId, documentTable.id)
    )
    .leftJoin(
      documentTagTable,
      eq(documentTagTable.id, documentToDocumentTagTable.documentTagId)
    )
    .where(
      and(
        eq(documentTable.organizationId, organizationId),
        eq(documentTable.id, documentId)
      )
    )
    .groupBy(
      documentTable.id,
      documentTable.record,
      documentTable.image,
      documentTable.name,
      documentTable.email,
      documentTable.address,
      documentTable.phone,
      documentTable.stage,
      documentTable.createdAt
    );

  if (!document) {
    return notFound();
  }

  return {
    id: document.id,
    record: document.record,
    image: document.image ?? undefined,
    name: document.name,
    email: document.email ?? undefined,
    address: document.address ?? undefined,
    phone: document.phone ?? undefined,
    stage: document.stage,
    createdAt: document.createdAt,
    tags: document.tags ?? []
  };
}

export async function getDocument(
  input: GetDocumentSchema
): Promise<DocumentDto> {
  const ctx = await getAuthOrganizationContext();

  const result = getDocumentSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(JSON.stringify(result.error.flatten()));
  }

  return getDocumentData(ctx.organization.id, result.data.id);
}
