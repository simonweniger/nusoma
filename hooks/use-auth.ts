'use client';

import { useUser } from '@clerk/nextjs';

export function useAuth() {
  const { user, isLoaded, isSignedIn } = useUser();

  // Note: Auth sync with InstantDB is handled by InstantDBAuthSync component
  // This hook only provides auth state, not auth sync functionality

  return {
    user,
    isLoaded,
    isSignedIn,
    email: user?.primaryEmailAddress?.emailAddress,
    userId: user?.id,
  };
}
