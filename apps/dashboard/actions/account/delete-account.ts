'use server';

import { updateTag } from 'next/cache';

import { adjustSeats } from '@workspace/billing/seats';
import { db, eq } from '@workspace/database/client';
import {
  accountTable,
  changeEmailRequestTable,
  invitationTable,
  membershipTable,
  resetPasswordRequestTable,
  sessionTable,
  userTable,
  verificationTokenTable
} from '@workspace/database/schema';

import { authActionClient } from '~/actions/safe-action';
import { Caching, OrganizationCacheKey } from '~/data/caching';

export const deleteAccount = authActionClient
  .metadata({ actionName: 'deleteAccount' })
  .action(async ({ ctx }) => {
    if (ctx.session.user.memberships.some((membership) => membership.isOwner)) {
      throw new Error('Cannot delete account while owning an organization');
    }

    await db.transaction(async (trx) => {
      await trx
        .delete(invitationTable)
        .where(eq(invitationTable.email, ctx.session.user.email));
      await trx
        .delete(accountTable)
        .where(eq(accountTable.userId, ctx.session.user.id));
      await trx
        .delete(sessionTable)
        .where(eq(sessionTable.userId, ctx.session.user.id));
      await trx
        .delete(verificationTokenTable)
        .where(eq(verificationTokenTable.identifier, ctx.session.user.email));
      await trx
        .delete(changeEmailRequestTable)
        .where(eq(changeEmailRequestTable.userId, ctx.session.user.id));
      await trx
        .delete(resetPasswordRequestTable)
        .where(eq(resetPasswordRequestTable.email, ctx.session.user.email));
      await trx
        .delete(membershipTable)
        .where(eq(membershipTable.userId, ctx.session.user.id));
      await trx.delete(userTable).where(eq(userTable.id, ctx.session.user.id));
    });

    for (const membership of ctx.session.user.memberships) {
      updateTag(
        Caching.createOrganizationTag(
          OrganizationCacheKey.Members,
          membership.organizationId
        )
      );
      try {
        await adjustSeats(membership.organizationId);
      } catch (e) {
        console.error(e);
      }
    }
  });
