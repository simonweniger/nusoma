import { db, eq } from '@workspace/database/client';
import { organizationTable } from '@workspace/database/schema';

import type { UpsertCustomer } from '../provider/types';

export async function upsertCustomer(customer: UpsertCustomer): Promise<void> {
  if (!customer.organizationId) {
    const [organization] = await db
      .select({ id: organizationTable.id })
      .from(organizationTable)
      .where(eq(organizationTable.billingCustomerId, customer.customerId))
      .limit(1);

    if (!organization) {
      throw new Error('Billing customer not found');
    }

    customer.organizationId = organization.id;
  }

  await db
    .update(organizationTable)
    .set({
      billingCustomerId: customer.customerId,
      billingEmail: customer.email,
      billingLine1: customer.line1,
      billingLine2: customer.line2,
      billingCity: customer.city,
      billingPostalCode: customer.postalCode,
      billingCountry: customer.country,
      billingState: customer.state
    })
    .where(eq(organizationTable.id, customer.organizationId));
}
