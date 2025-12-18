'use server';

import { updateTag } from 'next/cache';

import { BillingProvider } from '@workspace/billing/provider';
import { db, eq } from '@workspace/database/client';
import { organizationTable } from '@workspace/database/schema';

import { authOrganizationActionClient } from '~/actions/safe-action';
import { Caching, OrganizationCacheKey, UserCacheKey } from '~/data/caching';
import { updateOrganizationDetailsSchema } from '~/schemas/organization/update-organization-details-schema';

export const updateOrganizationDetails = authOrganizationActionClient
  .metadata({ actionName: 'updateOrganizationDetails' })
  .inputSchema(updateOrganizationDetailsSchema)
  .action(async ({ parsedInput, ctx }) => {
    await db
      .update(organizationTable)
      .set({
        name: parsedInput.name,
        address: parsedInput.address ? parsedInput.address : null,
        phone: parsedInput.phone ? parsedInput.phone : null,
        email: parsedInput.email ? parsedInput.email : null,
        website: parsedInput.website ? parsedInput.website : null
      })
      .where(eq(organizationTable.id, ctx.organization.id));

    if (ctx.organization.name !== parsedInput.name) {
      if (ctx.organization.billingCustomerId) {
        try {
          await BillingProvider.updateCustomerName({
            customerId: ctx.organization.billingCustomerId,
            name: parsedInput.name
          });
        } catch (e) {
          console.error(e);
        }
      } else {
        console.warn('Billing customer ID is missing');
      }
    }

    for (const membership of ctx.organization.memberships) {
      updateTag(
        Caching.createUserTag(UserCacheKey.Organizations, membership.userId));
    }

    updateTag(
      Caching.createOrganizationTag(
        OrganizationCacheKey.OrganizationDetails,
        ctx.organization.id
      ));
  });
