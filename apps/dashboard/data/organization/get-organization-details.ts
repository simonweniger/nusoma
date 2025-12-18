import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { getAuthOrganizationContext } from '@workspace/auth/context';
import { NotFoundError } from '@workspace/common/errors';
import { db, eq } from '@workspace/database/client';
import { organizationTable } from '@workspace/database/schema';

import { Caching, OrganizationCacheKey } from '~/data/caching';
import type { OrganizationDetailsDto } from '~/types/dtos/organization-details-dto';

async function getOrganizationDetailsData(
  organizationId: string
): Promise<OrganizationDetailsDto> {
  'use cache';
  cacheLife('default');
  cacheTag(
    Caching.createOrganizationTag(
      OrganizationCacheKey.OrganizationDetails,
      organizationId
    )
  );

  const [organization] = await db
    .select({
      name: organizationTable.name,
      address: organizationTable.address,
      phone: organizationTable.phone,
      email: organizationTable.email,
      website: organizationTable.website
    })
    .from(organizationTable)
    .where(eq(organizationTable.id, organizationId))
    .limit(1);

  if (!organization) {
    throw new NotFoundError('Organization not found');
  }

  return {
    name: organization.name,
    address: organization.address ? organization.address : undefined,
    phone: organization.phone ? organization.phone : undefined,
    email: organization.email ? organization.email : undefined,
    website: organization.website ? organization.website : undefined
  };
}

export async function getOrganizationDetails(): Promise<OrganizationDetailsDto> {
  const ctx = await getAuthOrganizationContext();
  return getOrganizationDetailsData(ctx.organization.id);
}
