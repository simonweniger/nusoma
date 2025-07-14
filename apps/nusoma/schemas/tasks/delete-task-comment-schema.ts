import { z } from 'zod'

export const deleteTaskCommentSchema = z.object({
  id: z
    .string({
      required_error: 'Id is required.',
      invalid_type_error: 'Id must be a string.',
    })
    .trim()
    .uuid('Id is invalid.')
    .min(1, 'Id is required.')
    .max(36, 'Maximum 36 characters allowed.'),
})

export type DeleteTaskCommentSchema = z.infer<typeof deleteTaskCommentSchema>
