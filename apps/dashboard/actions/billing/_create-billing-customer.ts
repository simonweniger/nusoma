import { getAuthOrganizationContext } from '@workspace/auth/context';
import { BillingProvider } from '@workspace/billing/provider';
import { db, eq } from '@workspace/database/client';
import { organizationTable } from '@workspace/database/schema';

export async function createBillingCustomer(
  ctx: Awaited<ReturnType<typeof getAuthOrganizationContext>>
) {
  const billingCustomerId = await BillingProvider.createCustomer({
    organizationId: ctx.organization.id,
    name: ctx.organization.name,
    email: ctx.organization.email || ctx.session.user.email
  });

  await db
    .update(organizationTable)
    .set({ billingCustomerId })
    .where(eq(organizationTable.id, ctx.organization.id));

  ctx.organization.billingCustomerId = billingCustomerId;
}
