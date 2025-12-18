import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { getAuthOrganizationContext } from '@workspace/auth/context';
import { asc, db, eq } from '@workspace/database/client';
import { membershipTable, userTable } from '@workspace/database/schema';

import { Caching, OrganizationCacheKey } from '~/data/caching';
import type { MemberDto } from '~/types/dtos/member-dto';

async function getMembersData(organizationId: string): Promise<MemberDto[]> {
  'use cache';
  cacheLife('default');
  cacheTag(
    Caching.createOrganizationTag(OrganizationCacheKey.Members, organizationId)
  );

  const members = await db
    .select({
      role: membershipTable.role,
      isOwner: membershipTable.isOwner,
      user: {
        id: userTable.id,
        image: userTable.image,
        name: userTable.name,
        email: userTable.email,
        lastLogin: userTable.lastLogin,
        createdAt: userTable.createdAt
      }
    })
    .from(membershipTable)
    .innerJoin(userTable, eq(membershipTable.userId, userTable.id))
    .where(eq(membershipTable.organizationId, organizationId))
    .orderBy(asc(membershipTable.createdAt));

  return members.map((member) => ({
    id: member.user.id,
    image: member.user.image ?? undefined,
    name: member.user.name,
    email: member.user.email!,
    role: member.role,
    isOwner: member.isOwner,
    dateAdded: member.user.createdAt,
    lastLogin: member.user.lastLogin ?? undefined
  }));
}

export async function getMembers(): Promise<MemberDto[]> {
  const ctx = await getAuthOrganizationContext();
  return getMembersData(ctx.organization.id);
}
