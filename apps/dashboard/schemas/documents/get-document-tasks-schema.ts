import { z } from 'zod';

export const getDocumentTasksSchema = z.object({
  documentId: z
    .uuid('Document id is invalid.')
    .trim()
    .max(36, 'Maximum 36 characters allowed.')
});

export type GetDocumentTasksSchema = z.infer<typeof getDocumentTasksSchema>;
