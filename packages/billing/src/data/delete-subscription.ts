import { db, eq } from '@workspace/database/client';
import { subscriptionTable } from '@workspace/database/schema';

export async function deleteSubscription(
  subscriptionId: string
): Promise<void> {
  await db
    .delete(subscriptionTable)
    .where(eq(subscriptionTable.id, subscriptionId));
}
