import { Priority, TaskStatus } from '@nusoma/database/schema'
import { z } from 'zod'

export const updateTaskPropertiesSchema = z.object({
  id: z
    .string({
      required_error: 'Id is required.',
      invalid_type_error: 'Id must be a string.',
    })
    .trim()
    .uuid('Id is invalid.')
    .min(1, 'Id is required.')
    .max(36, 'Maximum 36 characters allowed.'),
  status: z.nativeEnum(TaskStatus, {
    required_error: 'Status is required',
    invalid_type_error: 'Status must be a string',
  }),
  priority: z.nativeEnum(Priority, {
    required_error: 'Priority is required',
    invalid_type_error: 'Priority must be a string',
  }),
  scheduleDate: z.coerce.date().optional(),
  assigneeId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  projectId: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
})

export type UpdateTaskPropertiesSchema = z.infer<typeof updateTaskPropertiesSchema>
