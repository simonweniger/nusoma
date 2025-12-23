import { z } from 'zod';

import { OAuthProviders } from '~/types/auth';

export const disconnectAccountSchema = z.object({
  provider: z.enum(OAuthProviders, {
    error: (issue) =>
      issue.input === undefined
        ? 'Provider is required'
        : 'Provider must be a string'
  })
});

export type DisconnectAccountSchema = z.infer<typeof disconnectAccountSchema>;
