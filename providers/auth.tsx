'use client';

import { ClerkProvider } from '@clerk/nextjs';
import type { ReactNode } from 'react';
import InstantDBAuthSync from '@/components/instant-auth-sync';
import { env } from '@/lib/env';

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <ClerkProvider publishableKey={env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <InstantDBAuthSync />
      {children}
    </ClerkProvider>
  );
}
