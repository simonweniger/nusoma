import 'server-only';

import { getAuthContext } from '@workspace/auth/context';
import { db, eq } from '@workspace/database/client';
import { accountTable } from '@workspace/database/schema';

import type { OAuthProviderType } from '~/types/auth';
import type { ConnectedAccountDto } from '~/types/dtos/connected-account-dto';

export async function getConnectedAccounts(): Promise<ConnectedAccountDto[]> {
  const ctx = await getAuthContext();

  const linked = await db
    .select({
      providerId: accountTable.providerId
    })
    .from(accountTable)
    .where(eq(accountTable.userId, ctx.session.user.id));

  const linkedIds = linked.map((a) => a.providerId);

  const providers = [
    { id: 'google', name: 'Google', type: 'oauth' },
    { id: 'microsoft', name: 'Microsoft', type: 'oauth' }
  ] as const;

  const connectedAccounts: ConnectedAccountDto[] = providers.map((p) => ({
    id: p.id as OAuthProviderType,
    name: p.name,
    type: p.type,
    linked: linkedIds.includes(p.id)
  }));

  return connectedAccounts;
}
