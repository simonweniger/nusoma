import { z } from 'zod';

export const submitRecoveryCodeSchema = z.object({
  token: z.string(),
  expiry: z.string(),
  recoveryCode: z.string().min(1, 'Recovery code is required')
});

export type SubmitRecoveryCodeSchema = z.infer<typeof submitRecoveryCodeSchema>;
