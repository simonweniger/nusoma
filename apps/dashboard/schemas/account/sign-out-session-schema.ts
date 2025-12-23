import { z } from 'zod';

export const signOutSessionSchema = z.object({
  sessionToken: z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? 'Session token is required.'
          : 'Session token must be a string.'
    })
    .trim()
    .min(1, 'Session token is required.')
    .max(255, 'Maximum 255 characters allowed.')
});

export type SignOutSessionSchema = z.infer<typeof signOutSessionSchema>;
