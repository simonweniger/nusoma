import * as React from 'react';
import { type Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { createSearchParamsCache, parseAsString } from 'nuqs/server';

import { auth } from '@workspace/auth';
import { routes } from '@workspace/routes';

import { createTitle } from '~/lib/formatters';

const paramsCache = createSearchParamsCache({
  token: parseAsString.withDefault('')
});

export const metadata: Metadata = {
  title: createTitle('Email Verification')
};

export default async function EmailVerificationPage({
  params
}: NextPageProps): Promise<React.JSX.Element> {
  const { token } = await paramsCache.parse(params);
  if (!token) {
    return notFound();
  }

  try {
    await auth.api.verifyEmail({
      query: { token },
      headers: await headers()
    });
  } catch {
    return redirect(routes.dashboard.auth.verifyEmail.Expired);
  }

  return redirect(routes.dashboard.auth.verifyEmail.Success);
}
