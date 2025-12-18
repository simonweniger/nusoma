import { isAfter } from 'date-fns';

import type { Maybe } from '@workspace/common/maybe';
import { isString } from '@workspace/common/type-guards';
import { db, eq } from '@workspace/database/client';
import { apiKeyTable } from '@workspace/database/schema';

import { API_KEY_LENGTH, API_KEY_PREFIX } from './constants';
import { hashApiKey } from './hash-api-key';

type ErrorResult = {
  success: false;
  errorMessage: string;
};

type SuccessResult = {
  success: true;
  id: string;
  organizationId: string;
};

export async function verifyApiKey(
  token: Maybe<string>
): Promise<ErrorResult | SuccessResult> {
  if (!token) {
    return {
      success: false,
      errorMessage: 'Missing API key'
    } as ErrorResult;
  }
  if (
    !isString(token) ||
    !token.startsWith(API_KEY_PREFIX) ||
    token.length !== API_KEY_LENGTH
  ) {
    return {
      success: false,
      errorMessage: 'Malformed API key'
    } as ErrorResult;
  }
  const [apiKey] = await db
    .select({
      id: apiKeyTable.id,
      expiresAt: apiKeyTable.expiresAt,
      organizationId: apiKeyTable.organizationId
    })
    .from(apiKeyTable)
    .where(eq(apiKeyTable.hashedKey, hashApiKey(token)))
    .limit(1);

  if (!apiKey) {
    return {
      success: false,
      errorMessage: 'API key not found or expired'
    } as ErrorResult;
  }
  const now = new Date();
  if (!!apiKey.expiresAt && isAfter(now, apiKey.expiresAt)) {
    return {
      success: false,
      errorMessage: 'API key not found or expired'
    } as ErrorResult;
  }

  await db
    .update(apiKeyTable)
    .set({ lastUsedAt: now })
    .where(eq(apiKeyTable.id, apiKey.id));

  return {
    success: true,
    id: apiKey.id,
    organizationId: apiKey.organizationId
  } as SuccessResult;
}
