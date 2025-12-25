import { z } from 'zod';

export const exportCsvDocumentListSchema = z.object({
  organizationId: z
    .uuid('Organization id is invalid.')
    .trim()
    .min(1, 'Organization id is required.')
    .max(36, 'Maximum 36 characters allowed.'),
  ids: z.array(
    z
      .uuid('Id is invalid.')
      .trim()
      .min(1, 'Id is required.')
      .max(36, 'Maximum 36 characters allowed.')
  )
});

export type ExportCsvDocumentListSchema = z.infer<
  typeof exportCsvDocumentListSchema
>;
