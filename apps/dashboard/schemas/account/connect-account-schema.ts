import { z } from 'zod';

import { OAuthProviders } from '~/types/auth';

export const connectAccountSchema = z.object({
  provider: z.enum(OAuthProviders, {
    error: (issue) =>
      issue.input === undefined
        ? 'Provider is required'
        : 'Provider must be a string'
  })
});

export type ConnectAccountSchema = z.infer<typeof connectAccountSchema>;
