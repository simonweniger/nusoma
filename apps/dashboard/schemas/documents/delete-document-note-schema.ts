import { z } from 'zod';

export const deleteDocumentNoteSchema = z.object({
  id: z
    .uuid('Id is invalid.')
    .trim()
    .min(1, 'Id is required.')
    .max(36, 'Maximum 36 characters allowed.')
});

export type DeleteDocumentNoteSchema = z.infer<typeof deleteDocumentNoteSchema>;
