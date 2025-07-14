import { z } from 'zod'

export const addProjectCommentSchema = z.object({
  projectId: z
    .string({
      required_error: 'Project id is required.',
      invalid_type_error: 'Project id must be a string.',
    })
    .trim()
    .uuid('Project id is invalid.')
    .min(1, 'Project id is required.')
    .max(36, 'Maximum 36 characters allowed.'),
  text: z
    .string({
      required_error: 'Text is required.',
      invalid_type_error: 'Text must be a string.',
    })
    .trim()
    .min(1, 'Text is required.')
    .max(2000, 'Maximum 2000 characters allowed.'),
})

export type AddProjectCommentSchema = z.infer<typeof addProjectCommentSchema>
