import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { getAuthOrganizationContext } from '@workspace/auth/context';
import { db, eq } from '@workspace/database/client';
import {
  documentTable,
  documentTagTable,
  documentToDocumentTagTable
} from '@workspace/database/schema';

import { Caching, OrganizationCacheKey } from '~/data/caching';
import type { TagDto } from '~/types/dtos/tag-dto';

async function getDocumentTagsData(organizationId: string): Promise<TagDto[]> {
  'use cache';
  cacheLife('default');
  cacheTag(
    Caching.createOrganizationTag(
      OrganizationCacheKey.DocumentTags,
      organizationId
    )
  );
  cacheTag(
    Caching.createOrganizationTag(OrganizationCacheKey.Documents, organizationId)
  );

  const documentTags = await db
    .selectDistinct({
      id: documentTagTable.id,
      text: documentTagTable.text
    })
    .from(documentTagTable)
    .innerJoin(
      documentToDocumentTagTable,
      eq(documentTagTable.id, documentToDocumentTagTable.documentTagId)
    )
    .innerJoin(
      documentTable,
      eq(documentToDocumentTagTable.documentId, documentTable.id)
    )
    .where(eq(documentTable.organizationId, organizationId))
    .orderBy(documentTagTable.text);

  return documentTags;
}

export async function getDocumentTags(): Promise<TagDto[]> {
  const ctx = await getAuthOrganizationContext();
  return getDocumentTagsData(ctx.organization.id);
}
