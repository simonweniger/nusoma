import { z } from 'zod';

export const getDocumentNotesSchema = z.object({
  documentId: z
    .uuid('Document id is invalid.')
    .trim()
    .max(36, 'Maximum 36 characters allowed.')
});

export type GetDocumentNotesSchema = z.infer<typeof getDocumentNotesSchema>;
