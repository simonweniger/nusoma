import { auth, currentUser as clerkCurrentUser } from '@clerk/nextjs/server';
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
  const clerkUser = await clerkCurrentUser();

  if (!clerkUser) {
    throw new Error('User not authenticated');
  }

  // Get the user's primary email address
  const email = clerkUser.emailAddresses.find(
    (e) => e.id === clerkUser.primaryEmailAddressId
  )?.emailAddress;

  if (!email) {
    throw new Error('User email not found');
  }

  // Query InstantDB $users by email (InstantDB creates users based on email from JWT)
  const { $users } = await adminDb.query({
    $users: {
      $: { where: { email } },
    },
  });

  const userProfile = $users[0];

  if (!userProfile) {
    throw new Error(
      'User profile not found in InstantDB - make sure the user has signed in through the client to sync their account'
    );
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
