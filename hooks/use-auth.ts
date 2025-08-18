'use client';

import { useAuth as useClerkAuth, useUser } from '@clerk/nextjs';
import { useEffect } from 'react';
import { env } from '@/lib/env';
import db from '@/lib/instantdb';

export function useAuth() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { getToken } = useClerkAuth();

  // Sync Clerk auth state with InstantDB using the official method
  useEffect(() => {
    // biome-ignore lint/style/useBlockStatements: best solution here
    if (!isLoaded) return;

    if (isSignedIn && user) {
      getToken()
        .then((token) => {
          // Sign in to InstantDB using Clerk's session token
          db.auth.signInWithIdToken({
            clientName: env.NEXT_PUBLIC_CLERK_CLIENT_NAME,
            idToken: token as string,
          });
        })
        .catch((error) => {
          console.error('Error signing in with InstantDB:', error);
        });
    } else {
      // Sign out from InstantDB when user signs out from Clerk
      db.auth.signOut();
    }
  }, [isLoaded, isSignedIn, user, getToken]);

  return {
    user,
    isLoaded,
    isSignedIn,
    email: user?.primaryEmailAddress?.emailAddress,
    userId: user?.id,
  };
}
