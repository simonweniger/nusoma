import { db, eq } from '@workspace/database/client';
import { orderTable } from '@workspace/database/schema';

export async function updateOrderStatus(
  id: string,
  status: 'succeeded' | 'failed'
): Promise<void> {
  await db.update(orderTable).set({ status }).where(eq(orderTable.id, id));
}
