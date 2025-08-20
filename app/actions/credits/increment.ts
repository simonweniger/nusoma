'use server';

import { currentUserProfile } from '@/lib/auth';
import { parseError } from '@/lib/error/parse';
import { adminDb } from '@/lib/instantdb-admin';

export const incrementCredits = async (
  amount = 1
): Promise<
  | {
      success: true;
      newUsage: number;
    }
  | {
      error: string;
    }
> => {
  try {
    const profile = await currentUserProfile();

    if (!profile?.user) {
      throw new Error('User profile not found or not linked');
    }

    // Get current usage or default to 0
    const currentUsage = profile.creditUsage ?? 0;
    const newUsage = currentUsage + amount;

    // Update the credit usage
    await adminDb.transact([
      adminDb.tx.profiles[profile.id].update({
        creditUsage: newUsage,
      }),
    ]);

    return {
      success: true,
      newUsage,
    };
  } catch (error) {
    const message = parseError(error);
    return { error: message };
  }
};
