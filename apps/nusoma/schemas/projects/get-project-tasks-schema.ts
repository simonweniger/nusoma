import { z } from 'zod'

export const getProjectTasksSchema = z.object({
  projectId: z
    .string({
      invalid_type_error: 'Project id must be a string.',
    })
    .trim()
    .uuid('Project id is invalid.')
    .max(36, 'Maximum 36 characters allowed.'),
})

export type GetProjectTasksSchema = z.infer<typeof getProjectTasksSchema>
