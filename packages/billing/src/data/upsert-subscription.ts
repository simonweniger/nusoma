import { db, eq } from '@workspace/database/client';
import {
  organizationTable,
  subscriptionItemTable,
  subscriptionTable
} from '@workspace/database/schema';

import type { UpsertSubscription } from '../provider/types';

export async function upsertSubscription(
  subscriptionData: UpsertSubscription
): Promise<void> {
  if (!subscriptionData.organizationId) {
    const [organization] = await db
      .select({ id: organizationTable.id })
      .from(organizationTable)
      .where(
        eq(organizationTable.billingCustomerId, subscriptionData.customerId)
      )
      .limit(1);

    if (!organization) {
      throw new Error('Billing customer not found');
    }

    subscriptionData.organizationId = organization.id;
  }

  const [existingSubscription] = await db
    .select({ id: subscriptionTable.id })
    .from(subscriptionTable)
    .where(eq(subscriptionTable.id, subscriptionData.subscriptionId))
    .limit(1);

  if (existingSubscription) {
    await db
      .update(subscriptionTable)
      .set({
        organizationId: subscriptionData.organizationId,
        status: subscriptionData.status,
        active: subscriptionData.active,
        provider: subscriptionData.provider,
        cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd,
        currency: subscriptionData.currency,
        // periodStartsAt: subscriptionData.periodStartsAt,
        // periodEndsAt: subscriptionData.periodEndsAt,
        // trialEndsAt: subscriptionData.trialEndsAt,
        // trialStartsAt: subscriptionData.trialStartsAt
        periodStartsAt: new Date(subscriptionData.periodStartsAt),
        periodEndsAt: new Date(subscriptionData.periodEndsAt),
        trialEndsAt: subscriptionData.trialEndsAt
          ? new Date(subscriptionData.trialEndsAt)
          : undefined,
        trialStartsAt: subscriptionData.trialStartsAt
          ? new Date(subscriptionData.trialStartsAt)
          : undefined
      })
      .where(eq(subscriptionTable.id, subscriptionData.subscriptionId));
  } else {
    await db.insert(subscriptionTable).values({
      id: subscriptionData.subscriptionId,
      organizationId: subscriptionData.organizationId,
      status: subscriptionData.status,
      active: subscriptionData.active,
      provider: subscriptionData.provider,
      cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd,
      currency: subscriptionData.currency,
      periodStartsAt: new Date(subscriptionData.periodStartsAt),
      periodEndsAt: new Date(subscriptionData.periodEndsAt),
      trialEndsAt: subscriptionData.trialEndsAt
        ? new Date(subscriptionData.trialEndsAt)
        : undefined,
      trialStartsAt: subscriptionData.trialStartsAt
        ? new Date(subscriptionData.trialStartsAt)
        : undefined
    });
  }

  for (const item of subscriptionData.items) {
    const [existingItem] = await db
      .select({ id: subscriptionItemTable.id })
      .from(subscriptionItemTable)
      .where(eq(subscriptionItemTable.id, item.subscriptionItemId))
      .limit(1);

    if (existingItem) {
      await db
        .update(subscriptionItemTable)
        .set({
          quantity: item.quantity,
          productId: item.productId,
          variantId: item.variantId,
          priceAmount: item.priceAmount,
          interval: item.interval,
          intervalCount: item.intervalCount,
          type: item.type,
          model: item.model
        })
        .where(eq(subscriptionItemTable.id, item.subscriptionItemId));
    } else {
      await db.insert(subscriptionItemTable).values({
        id: item.subscriptionItemId,
        subscriptionId: subscriptionData.subscriptionId,
        quantity: item.quantity,
        productId: item.productId,
        variantId: item.variantId,
        priceAmount: item.priceAmount,
        interval: item.interval,
        intervalCount: item.intervalCount,
        type: item.type,
        model: item.model
      });
    }
  }
}
