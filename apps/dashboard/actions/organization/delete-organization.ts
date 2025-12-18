'use server';

import { updateTag } from 'next/cache';

import { isOrganizationOwner } from '@workspace/auth/permissions';
import { BillingProvider } from '@workspace/billing/provider';
import { ForbiddenError } from '@workspace/common/errors';
import { db, eq } from '@workspace/database/client';
import {
  membershipTable,
  organizationLogoTable,
  organizationTable
} from '@workspace/database/schema';

import { authOrganizationActionClient } from '~/actions/safe-action';
import { Caching, UserCacheKey } from '~/data/caching';

export const deleteOrganization = authOrganizationActionClient
  .metadata({ actionName: 'deleteOrganization' })
  .action(async ({ ctx }) => {
    const currentUserIsOwner = await isOrganizationOwner(
      ctx.session.user.id,
      ctx.organization.id
    );
    if (!currentUserIsOwner) {
      throw new ForbiddenError('Only owners can delete an organization.');
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(membershipTable)
        .where(eq(membershipTable.organizationId, ctx.organization.id));
      await tx
        .delete(organizationTable)
        .where(eq(organizationTable.id, ctx.organization.id));
      await tx
        .delete(organizationLogoTable)
        .where(eq(organizationLogoTable.organizationId, ctx.organization.id));
    });

    for (const membership of ctx.organization.memberships) {
      updateTag(
        Caching.createUserTag(UserCacheKey.Organizations, membership.userId));
      updateTag(
        Caching.createUserTag(UserCacheKey.Profile, membership.userId));
    }

    if (ctx.organization.billingCustomerId) {
      for (const subscription of ctx.organization.subscriptions) {
        try {
          await BillingProvider.cancelSubscription({
            subscriptionId: subscription.id
          });
        } catch (e) {
          console.error(e);
        }
      }
      try {
        await BillingProvider.deleteCustomer({
          customerId: ctx.organization.billingCustomerId
        });
      } catch (e) {
        console.error(e);
      }
    }
  });
