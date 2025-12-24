import { headers } from 'next/headers';
import { checkout, polar, portal } from '@polar-sh/better-auth';
import { Polar } from '@polar-sh/sdk';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { toNextJsHandler } from 'better-auth/next-js';
import { organization, twoFactor } from 'better-auth/plugins';

import { db } from '@workspace/database/client';
import * as schema from '@workspace/database/schema';
import { sendVerifyEmailAddressEmail } from '@workspace/email/send-verify-email-address-email';
import { baseUrl } from '@workspace/routes';

import { keys } from '../keys';

export const auth = betterAuth({
  baseURL: baseUrl.Dashboard,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.userTable,
      session: schema.sessionTable,
      account: schema.accountTable,
      verification: schema.verificationTable,
      organization: schema.organizationTable,
      member: schema.membershipTable,
      invitation: schema.invitationTable
    }
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    async sendVerificationEmail({
      user,
      url,
      token
    }: {
      user: { email: string; name: string };
      url: string;
      token: string;
    }) {
      await sendVerifyEmailAddressEmail({
        recipient: user.email,
        name: user.name,
        otp: token,
        verificationLink: url
      });
    }
  },
  socialProviders: {
    google: {
      clientId: keys().AUTH_GOOGLE_CLIENT_ID!,
      clientSecret: keys().AUTH_GOOGLE_CLIENT_SECRET!
    },
    microsoft: {
      clientId: keys().AUTH_MICROSOFT_ENTRA_ID_CLIENT_ID!,
      clientSecret: keys().AUTH_MICROSOFT_ENTRA_ID_CLIENT_SECRET!
    }
  },
  plugins: [
    twoFactor(),
    organization(),
    polar({
      client: new Polar({
        accessToken: keys().POLAR_ACCESS_TOKEN!
      }),
      use: [checkout(), portal()]
    })
  ],
  advanced: {
    database: {
      generateId: 'uuid'
    }
  }
});

export const handlers = toNextJsHandler(auth);

// Helper to get session server-side, compatible with NextAuth's auth() / dedupedAuth() usage
// Returns { user, session } or null
export const dedupedAuth = async () => {
  const sessionData = await auth.api.getSession({
    headers: await headers()
  });
  return sessionData;
};

// Aliases for compatibility if needed, though signatures differ
export const signIn = auth.api.signInEmail;
export const signOut = auth.api.signOut;
