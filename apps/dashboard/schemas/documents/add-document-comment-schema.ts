import { z } from 'zod';

export const addDocumentCommentSchema = z.object({
  documentId: z
    .uuid('Document id is invalid.')
    .trim()
    .min(1, 'Document id is required.')
    .max(36, 'Maximum 36 characters allowed.'),
  text: z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? 'Text is required.'
          : 'Text must be a string.'
    })
    .trim()
    .min(1, 'Text is required.')
    .max(2000, 'Maximum 2000 characters allowed.')
});

export type AddDocumentCommentSchema = z.infer<typeof addDocumentCommentSchema>;
