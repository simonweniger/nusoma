'use server';

import { requireAuth } from '@/lib/auth';
import { parseError } from '@/lib/error/parse';
import { adminDb } from '@/lib/instantdb-admin';

export const updateProfileAction = async (
  userId: string,
  data: Record<string, unknown>
): Promise<
  | {
      success: true;
    }
  | {
      error: string;
    }
> => {
  try {
    const authUserId = await requireAuth();

    if (authUserId !== userId) {
      throw new Error('You can only update your own profile!');
    }

    await adminDb.transact([adminDb.tx.profiles[userId].update(data)]);

    return { success: true };
  } catch (error) {
    const message = parseError(error);

    return { error: message };
  }
};
