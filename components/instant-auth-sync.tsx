'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { useEffect } from 'react';
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
  const { isSignedIn } = useUser();
  const { getToken } = useAuth();

  useEffect(() => {
    if (isSignedIn) {
      getToken()
        .then((token) => {
          // Create a long-lived session with InstantDB for your Clerk user
          // It will look up the user by email or create a new user with
          // the email address in the session token.
          db.auth.signInWithIdToken({
            clientName: env.NEXT_PUBLIC_CLERK_CLIENT_NAME,
            idToken: token as string,
          });
        })
        .catch((error) => {
          console.error('Error signing in with InstantDB:', error);
        });
    } else {
      db.auth.signOut();
    }
  }, [isSignedIn, getToken]);

  return null;
}
