import Stripe from 'stripe';
import { currentUserProfile } from './auth';
import { env } from './env';
import { adminDb } from './instantdb-admin';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-07-30.basil',
});

const creditValue = 0.005;

export const trackCreditUsage = async ({
  action,
  cost,
}: {
  action: string;
  cost: number;
}) => {
  const profile = await currentUserProfile();
  const credits = Math.ceil(cost / creditValue);

  if (!profile) {
    throw new Error('User profile not found');
  }

  // Update InstantDB credit usage for real-time updates
  const currentUsage = profile.creditUsage ?? 0;
  await adminDb.transact([
    adminDb.tx.profiles[profile.id].update({
      creditUsage: currentUsage + credits,
    }),
  ]);

  // Also track in Stripe for billing (if customer has subscription)
  if (profile.customerId) {
    await stripe.billing.meterEvents.create({
      event_name: env.STRIPE_CREDITS_METER_NAME,
      payload: {
        action,
        value: credits.toString(),
        stripe_customer_id: profile.customerId,
      },
    });
  }
};
