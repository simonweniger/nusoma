import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { getAuthOrganizationContext } from '@workspace/auth/context';
import { db, eq } from '@workspace/database/client';
import {
  contactTable,
  contactTagTable,
  contactToContactTagTable
} from '@workspace/database/schema';

import { Caching, OrganizationCacheKey } from '~/data/caching';
import type { TagDto } from '~/types/dtos/tag-dto';

async function getContactTagsData(organizationId: string): Promise<TagDto[]> {
  'use cache';
  cacheLife('default');
  cacheTag(
    Caching.createOrganizationTag(
      OrganizationCacheKey.ContactTags,
      organizationId
    )
  );
  cacheTag(
    Caching.createOrganizationTag(OrganizationCacheKey.Contacts, organizationId)
  );

  const contactTags = await db
    .selectDistinct({
      id: contactTagTable.id,
      text: contactTagTable.text
    })
    .from(contactTagTable)
    .innerJoin(
      contactToContactTagTable,
      eq(contactTagTable.id, contactToContactTagTable.contactTagId)
    )
    .innerJoin(
      contactTable,
      eq(contactToContactTagTable.contactId, contactTable.id)
    )
    .where(eq(contactTable.organizationId, organizationId))
    .orderBy(contactTagTable.text);

  return contactTags;
}

export async function getContactTags(): Promise<TagDto[]> {
  const ctx = await getAuthOrganizationContext();
  return getContactTagsData(ctx.organization.id);
}
