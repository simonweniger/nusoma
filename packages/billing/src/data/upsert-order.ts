import { db, eq } from '@workspace/database/client';
import {
  orderItemTable,
  orderTable,
  organizationTable
} from '@workspace/database/schema';

import type { UpsertOrder } from '../provider/types';

export async function upsertOrder(orderData: UpsertOrder): Promise<void> {
  if (!orderData.organizationId) {
    const [organization] = await db
      .select({ id: organizationTable.id })
      .from(organizationTable)
      .where(eq(organizationTable.billingCustomerId, orderData.customerId))
      .limit(1);

    if (!organization) {
      throw new Error(
        `Billing customer not found for customerId: ${orderData.customerId}`
      );
    }

    orderData.organizationId = organization.id;
  }

  const [existingOrder] = await db
    .select({ id: orderTable.id })
    .from(orderTable)
    .where(eq(orderTable.id, orderData.orderId))
    .limit(1);

  if (existingOrder) {
    await db
      .update(orderTable)
      .set({
        status: orderData.status,
        provider: orderData.provider,
        currency: orderData.currency,
        totalAmount: orderData.totalAmount
      })
      .where(eq(orderTable.id, orderData.orderId));
  } else {
    await db.insert(orderTable).values({
      id: orderData.orderId,
      organizationId: orderData.organizationId,
      status: orderData.status,
      provider: orderData.provider,
      currency: orderData.currency,
      totalAmount: orderData.totalAmount
    });
  }

  for (const item of orderData.items) {
    const [existingItem] = await db
      .select({ id: orderItemTable.id })
      .from(orderItemTable)
      .where(eq(orderItemTable.id, item.orderItemId))
      .limit(1);

    if (existingItem) {
      await db
        .update(orderItemTable)
        .set({
          quantity: item.quantity,
          productId: item.productId,
          variantId: item.variantId,
          priceAmount: item.priceAmount,
          type: item.type,
          model: item.model
        })
        .where(eq(orderItemTable.id, item.orderItemId));
    } else {
      await db.insert(orderItemTable).values({
        id: item.orderItemId,
        orderId: orderData.orderId,
        quantity: item.quantity,
        productId: item.productId,
        variantId: item.variantId,
        priceAmount: item.priceAmount,
        type: item.type,
        model: item.model
      });
    }
  }
}
