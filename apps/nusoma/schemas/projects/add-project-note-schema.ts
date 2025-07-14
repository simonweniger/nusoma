import { z } from 'zod'

export const addProjectNoteSchema = z.object({
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
    .max(8000, 'Maximum 8000 characters allowed.')
    .optional()
    .or(z.literal('')),
})

export type AddProjectNoteSchema = z.infer<typeof addProjectNoteSchema>
