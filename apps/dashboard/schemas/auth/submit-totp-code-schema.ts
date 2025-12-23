import { z } from 'zod';

export const submitTotpCodeSchema = z.object({
  token: z.string(),
  // expiry is string date
  expiry: z.string(),
  totpCode: z.string().length(6, 'Code must be 6 digits')
});

export type SubmitTotpCodeSchema = z.infer<typeof submitTotpCodeSchema>;
