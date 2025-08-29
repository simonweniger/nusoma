'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useCallback, useEffect } from 'react';
import { env } from '@/lib/env';
import db from '@/lib/instantdb';

/**
 * InstantDBAuthSync component that syncs Clerk authentication with InstantDB
 *
 * This component should be placed in the root layout to ensure proper session management.
 * When a user signs in with Clerk, they are automatically signed in to InstantDB using
 * Clerk's session token. When they sign out from Clerk, they are signed out from InstantDB.
 */
export default function InstantDBAuthSync() {
  const { isSignedIn, isLoaded } = useUser();
  const { getToken } = useAuth();

  // Monitor InstantDB auth state as recommended in docs
  const {
    isLoading: instantLoading,
    user: instantUser,
    error: instantError,
  } = db.useAuth();

  const signInToInstantWithClerkToken = useCallback(async () => {
    try {
      // Get JWT from Clerk for signed-in user
      const idToken = await getToken();

      if (!idToken) {
        console.warn('No token received from Clerk');
        return;
      }

      // Create a long-lived session with InstantDB for your Clerk user
      // It will look up the user by email or create a new user with
      // the email address in the session token.
      await db.auth.signInWithIdToken({
        clientName: env.NEXT_PUBLIC_CLERK_CLIENT_NAME,
        idToken,
      });

      console.log('Successfully signed in to InstantDB');
    } catch (error) {
      console.error('Error signing in with InstantDB:', error);
    }
  }, [getToken]);

  useEffect(() => {
    // Don't proceed until Clerk auth is fully loaded
    if (!isLoaded) {
      return;
    }

    if (isSignedIn && !instantUser && !instantLoading) {
      // Sign in to Instant if Clerk user is signed in but Instant user is not
      signInToInstantWithClerkToken();
    } else if (!isSignedIn && instantUser) {
      // Sign out from InstantDB when user signs out from Clerk
      db.auth.signOut().catch((error) => {
        console.error('Error signing out from InstantDB:', error);
      });
    }
  }, [
    isLoaded,
    isSignedIn,
    instantUser,
    instantLoading,
    signInToInstantWithClerkToken,
  ]);

  // Log InstantDB auth errors for debugging
  useEffect(() => {
    if (instantError) {
      console.error('InstantDB auth error:', instantError);
    }
  }, [instantError]);

  return null;
}
