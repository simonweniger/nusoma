import { db, eq, sql } from '@workspace/database/client';
import {
  membershipTable,
  subscriptionItemTable,
  subscriptionTable
} from '@workspace/database/schema';

import { BillingProvider } from './provider';
import { PriceModel } from './schema';

export async function countSeats(organizationId: string): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(membershipTable)
    .where(eq(membershipTable.organizationId, organizationId));

  return Number(result?.count ?? 0);
}

export async function adjustSeats(organizationId: string): Promise<void> {
  const [subscription] = await db
    .select({ id: subscriptionTable.id })
    .from(subscriptionTable)
    .where(eq(subscriptionTable.organizationId, organizationId))
    .limit(1);

  if (!subscription) {
    return;
  }

  const subscriptionItems = await db
    .select({
      id: subscriptionItemTable.id,
      model: subscriptionItemTable.model
    })
    .from(subscriptionItemTable)
    .where(eq(subscriptionItemTable.subscriptionId, subscription.id));

  const perSeatItems = subscriptionItems.filter(
    (item) => item.model === PriceModel.PerSeat
  );

  if (!perSeatItems.length) {
    return;
  }

  const quantity = await countSeats(organizationId);

  try {
    await Promise.all(
      perSeatItems.map((item) =>
        BillingProvider.updateSubscriptionItemQuantity({
          subscriptionId: subscription.id,
          subscriptionItemId: item.id,
          quantity
        })
      )
    );
  } catch (error) {
    console.error(
      `Failed to update subscription quantities for organization ${organizationId}:`,
      error
    );
    throw new Error(
      'Failed to update subscription quantities. Please try again later.'
    );
  }
}
