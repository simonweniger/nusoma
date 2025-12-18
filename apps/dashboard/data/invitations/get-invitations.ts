import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { getAuthOrganizationContext } from '@workspace/auth/context';
import { and, asc, db, eq, ne } from '@workspace/database/client';
import { InvitationStatus, invitationTable } from '@workspace/database/schema';

import { Caching, OrganizationCacheKey } from '~/data/caching';
import type { InvitationDto } from '~/types/dtos/invitation-dto';

async function getInvitationsData(
  organizationId: string
): Promise<InvitationDto[]> {
  'use cache';
  cacheLife('default');
  cacheTag(
    Caching.createOrganizationTag(
      OrganizationCacheKey.Invitations,
      organizationId
    )
  );

  const invitations = await db
    .select({
      id: invitationTable.id,
      token: invitationTable.token,
      status: invitationTable.status,
      email: invitationTable.email,
      role: invitationTable.role,
      createdAt: invitationTable.createdAt,
      lastSentAt: invitationTable.lastSentAt
    })
    .from(invitationTable)
    .where(
      and(
        eq(invitationTable.organizationId, organizationId),
        ne(invitationTable.status, InvitationStatus.ACCEPTED)
      )
    )
    .orderBy(asc(invitationTable.createdAt));

  return invitations.map((invitation) => ({
    id: invitation.id,
    token: invitation.token,
    status: invitation.status,
    email: invitation.email,
    role: invitation.role,
    lastSent: invitation.lastSentAt ?? undefined,
    dateAdded: invitation.createdAt
  }));
}

export async function getInvitations(): Promise<InvitationDto[]> {
  const ctx = await getAuthOrganizationContext();
  return getInvitationsData(ctx.organization.id);
}
