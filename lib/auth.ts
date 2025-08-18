import { auth, currentUser as clerkCurrentUser } from '@clerk/nextjs/server';
import { id } from '@instantdb/react';
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

export const createUserProfile = async (clerkUserId: string) => {
  const { profiles } = await adminDb.query({
    profiles: {
      $: { where: { clerkId: clerkUserId } },
    },
  });

  // If profile already exists, return it
  if (profiles[0]) {
    return profiles[0];
  }

  // Create new profile with Clerk user ID
  const profileId = id();
  await adminDb.transact([
    adminDb.tx.profiles[profileId].update({
      clerkId: clerkUserId,
    }),
  ]);

  // Query and return the newly created profile
  const { profiles: newProfiles } = await adminDb.query({
    profiles: {
      $: { where: { id: profileId } },
    },
  });

  return newProfiles[0];
};

export const currentUserProfile = async () => {
  const clerkUser = await clerkCurrentUser();

  if (!clerkUser) {
    throw new Error('User not authenticated');
  }

  // Query InstantDB profiles by Clerk user ID
  const { profiles } = await adminDb.query({
    profiles: {
      $: { where: { clerkId: clerkUser.id } },
    },
  });

  let userProfile = profiles[0];

  // If no profile exists, create one
  if (!userProfile) {
    userProfile = await createUserProfile(clerkUser.id);
  }

  if (!userProfile) {
    throw new Error('Failed to create or retrieve user profile');
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
