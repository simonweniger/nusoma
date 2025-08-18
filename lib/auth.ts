import { auth } from '@clerk/nextjs/server';
import { id } from '@instantdb/admin';
import { redirect } from 'next/navigation';
import { getCredits } from '@/app/actions/credits/get';
import { env } from './env';
import { adminDb } from './instantdb-admin';

export const currentUser = async () => {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  return {
    id: userId,
  };
};

export const requireAuth = async () => {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return userId;
};

export const currentUserProfile = async () => {
  const user = await currentUser();

  if (!user) {
    throw new Error('User not found');
  }

  // Query InstantDB for user profile using admin client
  const { profiles } = await adminDb.query({
    profiles: {
      $: { where: { 'user.id': user.id } },
    },
  });

  let userProfile = profiles[0];

  if (!userProfile) {
    try {
      // Create new profile if doesn't exist
      const profileId = id();
      await adminDb.transact(
        adminDb.tx.profiles[profileId]
          .update({
            id: user.id,
          })
          .link({ user: user.id })
      );

      // Fetch the newly created profile
      const { profiles: newProfiles } = await adminDb.query({
        profiles: {
          $: { where: { 'user.id': user.id } },
        },
      });
      userProfile = newProfiles[0];

      if (!userProfile) {
        throw new Error('Failed to create user profile');
      }
    } catch {
      // If profile creation fails, try to fetch again in case of race condition
      const { profiles: retryProfiles } = await adminDb.query({
        profiles: {
          $: { where: { 'user.id': user.id } },
        },
      });
      userProfile = retryProfiles[0];

      if (!userProfile) {
        throw new Error('Profile creation failed due to race condition');
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
