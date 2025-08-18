import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { env } from '@/lib/env';
import { parseError } from '@/lib/error/parse';
import { adminDb } from '@/lib/instantdb-admin';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    const message = parseError(error);

    return new NextResponse(`Error verifying webhook signature: ${message}`, {
      status: 400,
    });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer.id;

        if (!subscription.metadata.userId) {
          throw new Error('User ID not found');
        }

        // Get customer to find the user ID
        const customer = await stripe.customers.retrieve(customerId);

        if (customer.deleted) {
          throw new Error('Customer is deleted');
        }

        // If the customer has changed plan, we need to cancel the old subscription
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
        });

        for (const oldSubscription of subscriptions.data) {
          if (oldSubscription.id !== subscription.id) {
            await stripe.subscriptions.cancel(oldSubscription.id, {
              cancellation_details: {
                comment: 'Customer has changed plan',
              },
            });
          }
        }

        // Find the user and update their subscription info
        const { $users } = await adminDb.query({
          $users: {
            $: { where: { id: subscription.metadata.userId } },
          },
        });

        const userProfile = $users[0];

        if (userProfile) {
          await adminDb.transact(
            adminDb.tx.$users[userProfile.id].update({
              customerId,
              subscriptionId: subscription.id,
              productId: subscription.items.data[0]?.price.product as string,
            })
          );
        }

        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        if (!subscription.metadata.userId) {
          throw new Error('User ID not found');
        }

        const { $users } = await adminDb.query({
          $users: {
            $: { where: { id: subscription.metadata.userId } },
          },
        });

        const userProfile = $users[0];

        if (!userProfile) {
          throw new Error('User not found');
        }

        if (userProfile.subscriptionId === subscription.id) {
          await adminDb.transact(
            adminDb.tx.$users[userProfile.id].update({
              subscriptionId: null,
              productId: null,
            })
          );
        }

        break;
      }
      default:
        break;
    }

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    const message = parseError(error);

    return new NextResponse(`Error processing webhook: ${message}`, {
      status: 500,
    });
  }
}
