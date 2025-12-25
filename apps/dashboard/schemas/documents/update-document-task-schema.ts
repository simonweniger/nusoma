import { z } from 'zod';

import { DocumentTaskStatus } from '@workspace/database/schema';

export const updateDocumentTaskSchema = z.object({
  id: z
    .uuid('Id is invalid.')
    .trim()
    .min(1, 'Id is required.')
    .max(36, 'Maximum 36 characters allowed.'),
  title: z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? 'Title is required.'
          : 'Title must be a string.'
    })
    .trim()
    .min(1, 'Title is required.')
    .max(64, `Maximum 64 characters allowed.`),
  description: z
    .string({
      error: (issue) =>
        issue.input === undefined ? undefined : 'Description must be a string.'
    })
    .trim()
    .max(4000, `Maximum 4000 characters allowed.`)
    .optional()
    .or(z.literal('')),
  dueDate: z.date().optional(),
  status: z.enum(DocumentTaskStatus, {
    error: (issue) =>
      issue.input === undefined
        ? 'Status is required'
        : 'Status must be a string'
  })
});

export type UpdateDocumentTaskSchema = z.infer<typeof updateDocumentTaskSchema>;
