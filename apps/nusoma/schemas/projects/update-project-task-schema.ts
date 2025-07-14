import { TaskStatus } from '@nusoma/database/schema'
import { z } from 'zod'

export const updateProjectTaskSchema = z.object({
  id: z
    .string({
      required_error: 'Id is required.',
      invalid_type_error: 'Id must be a string.',
    })
    .trim()
    .uuid('Id is invalid.')
    .min(1, 'Id is required.')
    .max(36, 'Maximum 36 characters allowed.'),
  title: z
    .string({
      required_error: 'Title is required.',
      invalid_type_error: 'Title must be a string.',
    })
    .trim()
    .min(1, 'Title is required.')
    .max(64, 'Maximum 64 characters allowed.'),
  description: z
    .string({
      invalid_type_error: 'Description must be a string.',
    })
    .trim()
    .max(4000, 'Maximum 4000 characters allowed.')
    .optional()
    .or(z.literal('')),
  status: z.nativeEnum(TaskStatus, {
    required_error: 'Status is required',
    invalid_type_error: 'Status must be a string',
  }),
  scheduleDate: z
    .date({
      required_error: 'Schedule date is required',
      invalid_type_error: 'Schedule date must be a date',
    })
    .optional(),
})

export type UpdateProjectTaskSchema = z.infer<typeof updateProjectTaskSchema>
