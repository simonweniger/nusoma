import { z } from 'zod'

export const addTaskCommentSchema = z.object({
  taskId: z
    .string({
      required_error: 'Task id is required.',
      invalid_type_error: 'Task id must be a string.',
    })
    .trim()
    .uuid('Task id is invalid.')
    .min(1, 'Task id is required.')
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

export type AddTaskCommentSchema = z.infer<typeof addTaskCommentSchema>
