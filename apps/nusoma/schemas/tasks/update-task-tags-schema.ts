import { z } from 'zod'

export const updateTaskTagsSchema = z.object({
  id: z
    .string({
      required_error: 'Id is required.',
      invalid_type_error: 'Id must be a string.',
    })
    .trim()
    .uuid('Id is invalid.')
    .min(1, 'Id is required.')
    .max(36, 'Maximum 36 characters allowed.'),
  labels: z.array(
    z.object({
      id: z.string(),
      text: z
        .string({
          required_error: 'Tag is required.',
          invalid_type_error: 'Tag must be a string.',
        })
        .trim()
        .min(1, 'Tag is required.')
        .max(200, 'Maximum 200 characters allowed.'),
    })
  ),
})

export type UpdateTaskTagsSchema = z.infer<typeof updateTaskTagsSchema>
