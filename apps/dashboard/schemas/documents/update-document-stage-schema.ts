import { z } from 'zod';

import { DocumentStage } from '@workspace/database/schema';

export const updateDocumentStageSchema = z.object({
  id: z
    .uuid('Id is invalid.')
    .trim()
    .min(1, 'Id is required.')
    .max(36, 'Maximum 36 characters allowed.'),
  stage: z.enum(DocumentStage, {
    error: (issue) =>
      issue.input === undefined ? 'Stage is required' : 'Stage must be a string'
  })
});

export type UpdateDocumentStageSchema = z.infer<typeof updateDocumentStageSchema>;
