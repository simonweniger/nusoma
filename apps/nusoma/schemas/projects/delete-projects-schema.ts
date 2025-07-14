import { z } from 'zod'

export const deleteProjectsSchema = z.object({
  ids: z.array(
    z
      .string({
        required_error: 'Id is required.',
        invalid_type_error: 'Id must be a string.',
      })
      .trim()
      .uuid('Id is invalid.')
      .min(1, 'Id is required.')
      .max(36, 'Maximum 36 characters allowed.')
  ),
  workspaceId: z
    .string({
      required_error: 'Workspace ID is required.',
      invalid_type_error: 'Workspace ID must be a string.',
    })
    .trim()
    .uuid('Workspace ID is invalid.')
    .min(1, 'Workspace ID is required.')
    .max(36, 'Maximum 36 characters allowed.'),
})

export type DeleteProjectsSchema = z.infer<typeof deleteProjectsSchema>
