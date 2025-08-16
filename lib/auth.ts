import { eq } from 'drizzle-orm';
import { getCredits } from '@/app/actions/credits/get';
import { profile } from '@/schema';
import { database } from './database';
import { env } from './env';
import { createClient } from './supabase/server';

export const currentUser = async () => {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  return user;
};

export const currentUserProfile = async () => {
  const user = await currentUser();

  if (!user) {
    throw new Error('User not found');
  }

  const userProfiles = await database
    .select()
    .from(profile)
    .where(eq(profile.id, user.id));
  let userProfile = userProfiles.at(0);

  if (!userProfile && user.email) {
    try {
      const response = await database
        .insert(profile)
        .values({ id: user.id })
        .returning();

      if (!response.length) {
        throw new Error('Failed to create user profile');
      }

      userProfile = response[0];
    } catch (error) {
      // If we get a duplicate key error, the profile was created by another request
      // Let's fetch it again
      if (error instanceof Error && error.message.includes('23505')) {
        const retryProfiles = await database
          .select()
          .from(profile)
          .where(eq(profile.id, user.id));
        userProfile = retryProfiles.at(0);

        if (!userProfile) {
          throw new Error('Profile creation failed due to race condition');
        }
      } else {
        throw error;
      }
    }
  }

  return userProfile;
};

export const getSubscribedUser = async () => {
  const user = await currentUser();

  if (!user) {
    throw new Error('Create an account to use AI features.');
  }

  const profile = await currentUserProfile();

  if (!profile) {
    throw new Error('User profile not found');
  }

  const isDevMode = process.env.NODE_ENV === 'development';

  // Skip subscription checks in development mode
  if (isDevMode) {
    return user;
  }

  if (!profile.subscriptionId) {
    throw new Error('Claim your free AI credits to use this feature.');
  }

  const credits = await getCredits();

  if ('error' in credits) {
    throw new Error(credits.error);
  }

  if (
    profile.productId === env.STRIPE_HOBBY_PRODUCT_ID &&
    credits.credits <= 0
  ) {
    throw new Error(
      'Sorry, you have no credits remaining! Please upgrade for more credits.'
    );
  }

  return user;
};
