import { polarClient } from '@polar-sh/better-auth/client';
import { organizationClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL:
    process.env.NEXT_PUBLIC_DASHBOARD_URL ||
    (typeof window !== 'undefined' ? window.location.origin : undefined),
  plugins: [organizationClient(), polarClient()]
});
