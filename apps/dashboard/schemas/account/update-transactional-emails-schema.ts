import { z } from 'zod';

export const updateTransactionalEmailsSchema = z.object({
  enabledDocumentsNotifications: z.boolean(),
  enabledInboxNotifications: z.boolean(),
  enabledWeeklySummary: z.boolean()
});

export type UpdateTransactionalEmailsSchema = z.infer<
  typeof updateTransactionalEmailsSchema
>;
