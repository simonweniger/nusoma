import { auth, currentUser as clerkCurrentUser } from '@clerk/nextjs/server';
import { id } from '@instantdb/react';
import { redirect } from 'next/navigation';

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

export const currentInstantUser = async () => {
  const clerkUser = await clerkCurrentUser();

  if (!clerkUser) {
    throw new Error('User not authenticated');
  }

  // Query for the InstantDB user by email
  const { $users } = await adminDb.query({
    $users: {
      $: {
        where: { email: clerkUser.primaryEmailAddress?.emailAddress || '' },
      },
    },
  });

  const instantUser = $users[0];

  if (!instantUser) {
    throw new Error(
      'InstantDB user not found. Make sure the user is signed in to InstantDB.'
    );
  }

  return instantUser;
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

  try {
    // Create new profile with Clerk user ID first (without linking)
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
    // biome-ignore lint/suspicious/noExplicitAny: needed here
  } catch (error: any) {
    // If we get a unique constraint error, it means another concurrent request
    // already created the profile. Query and return the existing one.
    if (
      error?.body?.message?.includes('unique attribute') ||
      error?.body?.message?.includes('already exists')
    ) {
      const { profiles: existingProfiles } = await adminDb.query({
        profiles: {
          $: { where: { clerkId: clerkUserId } },
        },
      });

      if (existingProfiles[0]) {
        return existingProfiles[0];
      }
    }

    // Re-throw the error if it's not a unique constraint violation
    throw error;
  }
};

export const linkProfileToUser = async (profileId: string) => {
  try {
    const instantUser = await currentInstantUser();

    // Link the profile to the InstantDB user
    await adminDb.transact([
      adminDb.tx.profiles[profileId].link({ user: instantUser.id }),
    ]);

    return true;
  } catch (error) {
    console.error('Error linking profile to user:', error);
    // If we can't find the InstantDB user yet, that's okay - we'll try again later
    return false;
  }
};

export const currentUserProfile = async () => {
  const clerkUser = await clerkCurrentUser();

  if (!clerkUser) {
    throw new Error('User not authenticated');
  }

  // Query InstantDB profiles by Clerk user ID with user relationship
  const { profiles } = await adminDb.query({
    profiles: {
      $: { where: { clerkId: clerkUser.id } },
      user: {},
    },
  });

  let userProfile = profiles[0];

  // If no profile exists, create one
  if (!userProfile) {
    const newProfile = await createUserProfile(clerkUser.id);
    // Re-query with user relationship to match expected type
    const { profiles: profilesWithUser } = await adminDb.query({
      profiles: {
        $: { where: { id: newProfile.id } },
        user: {},
      },
    });
    userProfile = profilesWithUser[0];
  }

  if (!userProfile) {
    throw new Error('Failed to create or retrieve user profile');
  }

  // If profile exists but isn't linked to a user, try to link it
  if (userProfile && !userProfile.user) {
    await linkProfileToUser(userProfile.id);
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

  // Check credits directly from InstantDB profile
  const HOBBY_CREDITS = 200;
  const totalCredits = profile.credits ?? HOBBY_CREDITS;
  const usedCredits = profile.creditUsage ?? 0;
  const remainingCredits = totalCredits - usedCredits;

  if (
    profile.productId === env.STRIPE_HOBBY_PRODUCT_ID &&
    remainingCredits <= 0
  ) {
    throw new Error(
      'Sorry, you have no credits remaining! Please upgrade for more credits.'
    );
  }

  return user;
};
