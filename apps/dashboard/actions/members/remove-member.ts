'use server';

import { updateTag } from 'next/cache';
import { redirect } from 'next/navigation';

import { isOrganizationAdmin } from '@workspace/auth/permissions';
import { adjustSeats } from '@workspace/billing/seats';
import { ForbiddenError, NotFoundError } from '@workspace/common/errors';
import { and, db, eq } from '@workspace/database/client';
import { membershipTable, userTable } from '@workspace/database/schema';
import { routes } from '@workspace/routes';

import { authOrganizationActionClient } from '~/actions/safe-action';
import { Caching, OrganizationCacheKey, UserCacheKey } from '~/data/caching';
import { removeMemberSchema } from '~/schemas/members/remove-member-schema';

export const removeMember = authOrganizationActionClient
  .metadata({ actionName: 'removeMember' })
  .inputSchema(removeMemberSchema)
  .action(async ({ parsedInput, ctx }) => {
    const isLeaving = ctx.session.user.id === parsedInput.id;
    if (!isLeaving) {
      const currentUserIsAdmin = await isOrganizationAdmin(
        ctx.session.user.id,
        ctx.organization.id
      );
      if (!currentUserIsAdmin) {
        throw new ForbiddenError('Insufficient permissions');
      }
    }

    const [membership] = await db
      .select({
        id: membershipTable.id,
        role: membershipTable.role,
        isOwner: membershipTable.isOwner,
        user: {
          email: userTable.email
        }
      })
      .from(membershipTable)
      .innerJoin(userTable, eq(membershipTable.userId, userTable.id))
      .where(
        and(
          eq(membershipTable.organizationId, ctx.organization.id),
          eq(membershipTable.userId, parsedInput.id)
        )
      )
      .limit(1);

    if (!membership) {
      throw new NotFoundError('Membership not found');
    }
    if (membership.isOwner) {
      throw new ForbiddenError('Owners cannot be removed.');
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(membershipTable)
        .where(eq(membershipTable.id, membership.id));
    });

    updateTag(
      Caching.createOrganizationTag(
        OrganizationCacheKey.Members,
        ctx.organization.id
      )
    );

    updateTag(Caching.createUserTag(UserCacheKey.Profile, parsedInput.id));
    updateTag(
      Caching.createUserTag(UserCacheKey.Organizations, parsedInput.id)
    );

    try {
      await adjustSeats(ctx.organization.id);
    } catch (e) {
      console.error(e);
    }

    if (isLeaving) {
      redirect(routes.dashboard.organizations.Index);
    }
  });
