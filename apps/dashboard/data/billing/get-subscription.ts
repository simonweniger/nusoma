import 'server-only';

import { getAuthOrganizationContext } from '@workspace/auth/context';
import { getProductPricePair } from '@workspace/billing/helpers';
import { BillingProvider } from '@workspace/billing/provider';
import { db, eq } from '@workspace/database/client';
import {
  subscriptionItemTable,
  subscriptionTable
} from '@workspace/database/schema';

import type { SubscriptionDto } from '~/types/dtos/subscription-dto';

export async function getSubscription(): Promise<SubscriptionDto | undefined> {
  const ctx = await getAuthOrganizationContext();

  const [subscription] = await db
    .select()
    .from(subscriptionTable)
    .where(eq(subscriptionTable.organizationId, ctx.organization.id))
    .limit(1);

  if (!subscription) {
    return undefined;
  }

  const items = await db
    .select()
    .from(subscriptionItemTable)
    .where(eq(subscriptionItemTable.subscriptionId, subscription.id));

  const response: SubscriptionDto = {
    id: subscription.id,
    status: subscription.status,
    active: subscription.active,
    provider: subscription.provider,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    currency: subscription.currency,
    periodStartsAt: subscription.periodStartsAt,
    periodEndsAt: subscription.periodEndsAt,
    trialStartsAt: subscription.trialStartsAt ?? undefined,
    trialEndsAt: subscription.trialEndsAt ?? undefined,
    items: items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      productId: item.productId,
      variantId: item.variantId,
      priceAmount: item.priceAmount ?? undefined,
      interval: item.interval,
      intervalCount: item.intervalCount,
      type: item.type ?? undefined,
      model: item.model ?? undefined
    }))
  };

  if (ctx.organization.billingCustomerId) {
    for (const item of response.items) {
      const { price } = getProductPricePair(item.variantId);
      if (price && price.meter && price.meter.id) {
        item.meteredUnit = price.meter.unit;
        item.meteredUsage = await BillingProvider.getMeteredUsage({
          meterId: price.meter.id,
          customerId: ctx.organization.billingCustomerId,
          startsAt: subscription.periodStartsAt,
          endsAt: subscription.periodEndsAt
        });
      }
    }
  }

  return response;
}
