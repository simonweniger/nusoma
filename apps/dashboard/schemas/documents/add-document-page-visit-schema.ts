import { z } from 'zod';

export const addDocumentPageVisitSchema = z.object({
  documentId: z
    .uuid('Document id is invalid.')
    .trim()
    .min(1, 'Document id is required.')
    .max(36, 'Maximum 36 characters allowed.')
});

export type AddDocumentPageVisitSchema = z.infer<
  typeof addDocumentPageVisitSchema
>;
