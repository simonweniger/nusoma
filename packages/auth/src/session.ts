import { randomUUID } from 'crypto';
import { addSeconds } from 'date-fns';
import { validate as uuidValidate } from 'uuid';

import type { Maybe } from '@workspace/common/maybe';
import {
  isDefined,
  isString,
  type IsDefinedGuard
} from '@workspace/common/type-guards';

import { auth } from './index';

type BetterAuthSession = typeof auth.$Infer.Session;

export function checkSession(
  sessionData: Maybe<BetterAuthSession>
): sessionData is IsDefinedGuard<BetterAuthSession> {
  // sessionData
  if (!sessionData) {
    // Normal behavior, no need to log a warning
    return false;
  }

  // sessionData.user
  if (!sessionData.user) {
    console.warn('No user found in the session. Unable to validate session.');
    return false;
  }

  // sessionData.user.id
  if (!isDefined(sessionData.user.id)) {
    console.warn('User ID is undefined. Validation failed.');
    return false;
  }
  if (!uuidValidate(sessionData.user.id)) {
    console.warn('Invalid user ID format. Expected a UUID.');
    return false;
  }

  // sessionData.user.email
  if (!isDefined(sessionData.user.email)) {
    console.warn(`User ${sessionData.user.id} has an undefined email.`);
    return false;
  }
  if (!isString(sessionData.user.email)) {
    console.warn(
      `Invalid email type for user ${sessionData.user.id}. Expected a string.`
    );
    return false;
  }

  // sessionData.user.name
  if (!isDefined(sessionData.user.name)) {
    console.warn(`User ${sessionData.user.id} has an undefined name.`);
    return false;
  }
  if (!isString(sessionData.user.name)) {
    console.warn(
      `Invalid name type for user ${sessionData.user.id}. Expected a string.`
    );
    return false;
  }

  return true;
}

export function generateSessionToken(): string {
  return randomUUID();
}

export function getSessionExpiryFromNow(): Date {
  return addSeconds(Date.now(), 30 * 24 * 60 * 60); // 30 days default
}

export const session = {
  maxAge: 60 * 60 * 24 * 30, // 30 days
  updateAge: 24 * 60 * 60, // 24 hours
  generateSessionToken,
  strategy: 'database'
};
