import { db, eq } from '@workspace/database/client';
import { organizationTable } from '@workspace/database/schema';

export async function deleteCustomer(customerId: string): Promise<void> {
  if (customerId) {
    await db
      .update(organizationTable)
      .set({
        billingCustomerId: null,
        billingEmail: null,
        billingLine1: null,
        billingLine2: null,
        billingCity: null,
        billingPostalCode: null,
        billingCountry: null,
        billingState: null
      })
      .where(eq(organizationTable.billingCustomerId, customerId));
  }
}
