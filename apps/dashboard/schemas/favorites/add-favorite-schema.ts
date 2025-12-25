import { z } from 'zod';

export const addFavoriteSchema = z.object({
  documentId: z
    .uuid('Document id is invalid.')
    .trim()
    .min(1, 'Document id is required.')
    .max(36, 'Maximum 36 characters allowed.')
});

export type AddFavoriteSchema = z.infer<typeof addFavoriteSchema>;
