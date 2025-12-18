import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { getAuthContext } from '@workspace/auth/context';
import { db, eq, sql } from '@workspace/database/client';
import { membershipTable, organizationTable } from '@workspace/database/schema';

import { Caching, UserCacheKey } from '~/data/caching';
import type { OrganizationDto } from '~/types/dtos/organization-dto';

async function getOrganizationsData(userId: string): Promise<OrganizationDto[]> {
  'use cache';
  cacheLife('default');
  cacheTag(Caching.createUserTag(UserCacheKey.Organizations, userId));

  const organizations = await db
    .select({
      id: organizationTable.id,
      logo: organizationTable.logo,
      name: organizationTable.name,
      slug: organizationTable.slug,
      membership: {
        createdAt: membershipTable.createdAt
      },
      membershipCount:
        sql<number>`COUNT(${membershipTable.id}) OVER (PARTITION BY ${organizationTable.id})`.mapWith(
          Number
        )
    })
    .from(organizationTable)
    .leftJoin(
      membershipTable,
      eq(organizationTable.id, membershipTable.organizationId)
    )
    .where(eq(membershipTable.userId, userId));

  return organizations
    .sort((a, b) => {
      if (!a.membership || !b.membership) {
        return 0;
      }
      return (
        a.membership.createdAt.getTime() - b.membership.createdAt.getTime()
      );
    })
    .map((organization) => ({
      id: organization.id,
      logo: organization.logo ? organization.logo : undefined,
      name: organization.name,
      slug: organization.slug,
      memberCount: organization.membershipCount
    }));
}

export async function getOrganizations(): Promise<OrganizationDto[]> {
  const ctx = await getAuthContext();
  return getOrganizationsData(ctx.session.user.id);
}
