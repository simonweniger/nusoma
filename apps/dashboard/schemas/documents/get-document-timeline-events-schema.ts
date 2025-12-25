import { z } from 'zod';

export const getDocumentTimelineEventsSchema = z.object({
  documentId: z
    .uuid('Document id is invalid.')
    .trim()
    .max(36, 'Maximum 36 characters allowed.')
});

export type GetDocumentTimelineEventsSchema = z.infer<
  typeof getDocumentTimelineEventsSchema
>;
