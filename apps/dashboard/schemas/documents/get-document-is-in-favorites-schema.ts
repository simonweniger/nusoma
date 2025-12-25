import { z } from 'zod';

export const getDocumentIsInFavoritesSchema = z.object({
  documentId: z
    .uuid('Document id is invalid.')
    .trim()
    .max(36, 'Maximum 36 characters allowed.')
});

export type GetDocumentAddedToFavoritesSchema = z.infer<
  typeof getDocumentIsInFavoritesSchema
>;
