import 'server-only';

import { getAuthContext } from '@workspace/auth/context';
import { and, db, desc, eq, gt } from '@workspace/database/client';
import { sessionTable } from '@workspace/database/schema';

import type { SessionDto } from '~/types/dtos/session-dto';

export async function getSessions(): Promise<SessionDto[]> {
  const ctx = await getAuthContext();

  if (!ctx.session) {
    return [];
  }

  const now = new Date();
  const sessions = await db
    .select({
      token: sessionTable.token,
      expiresAt: sessionTable.expiresAt
    })
    .from(sessionTable)
    .where(
      and(
        eq(sessionTable.userId, ctx.session.user.id),
        gt(sessionTable.expiresAt, now)
      )
    )
    .orderBy(desc(sessionTable.expiresAt));

  return sessions.map((s) => ({
    id: s.token,
    isCurrent: s.token === ctx.session.token,
    expires: s.expiresAt
  }));
}
