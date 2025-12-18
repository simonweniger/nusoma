import { and, db, isNull, not } from '@workspace/database/client';
import { organizationTable } from '@workspace/database/schema';

import { upsertCustomer } from './data/upsert-customer';
import { upsertOrder } from './data/upsert-order';
import { upsertSubscription } from './data/upsert-subscription';
import { BillingProvider } from './provider';

export async function experimental_synchronize(): Promise<void> {
  await syncFromProvider();
  await syncToProvider();
}

async function syncFromProvider(): Promise<void> {
  try {
    for await (const customer of BillingProvider.getCustomers()) {
      try {
        await upsertCustomer(customer);

        const subscriptions = await BillingProvider.getSubscriptions({
          customerId: customer.customerId
        });
        for (const subscription of subscriptions) {
          await upsertSubscription(subscription);
        }

        const orders = await BillingProvider.getOrders({
          customerId: customer.customerId
        });
        for (const order of orders) {
          await upsertOrder(order);
        }

        console.log(`Successfully synced customer ${customer.customerId}`);
      } catch (err) {
        console.error(`Failed to sync customer ${customer.customerId}:`, err);
      }
    }
  } catch (error) {
    console.error('Error during sync from provider:', error);
    throw error;
  }
}

async function syncToProvider(): Promise<void> {
  const organizations = await db
    .select({
      id: organizationTable.id,
      name: organizationTable.name,
      email: organizationTable.billingEmail
    })
    .from(organizationTable)
    .where(
      and(
        isNull(organizationTable.billingCustomerId),
        not(isNull(organizationTable.billingEmail))
      )
    );

  for (const organization of organizations) {
    if (organization.email) {
      try {
        await BillingProvider.createCustomer({
          organizationId: organization.id,
          name: organization.name,
          email: organization.email
        });
        console.log(
          `Created billing customer for organization ${organization.id}`
        );
      } catch (err) {
        console.error(
          `Failed to create customer for organization ${organization.id}:`,
          err
        );
      }
    }
  }
}
