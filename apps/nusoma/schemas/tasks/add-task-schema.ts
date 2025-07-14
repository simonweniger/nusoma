import { Priority, TaskStatus } from '@nusoma/database/schema'
import { z } from 'zod'

export const addTaskSchema = z.object({
  status: z.nativeEnum(TaskStatus, {
    required_error: 'Status is required',
    invalid_type_error: 'Status must be a string',
  }),
  projectId: z
    .string({
      required_error: 'Project ID is required',
      invalid_type_error: 'Project ID must be a string',
    })
    .optional(),
  workspaceId: z.string({
    required_error: 'Workspace ID is required',
    invalid_type_error: 'Workspace ID must be a string',
  }),
  title: z.string({
    required_error: 'Title is required',
    invalid_type_error: 'Title must be a string',
  }),
  description: z
    .string({
      required_error: 'Description is required',
      invalid_type_error: 'Description must be a string',
    })
    .optional(),
  assigneeId: z
    .string({
      required_error: 'Assignee ID is required',
      invalid_type_error: 'Assignee ID must be a string',
    })
    .trim()
    .min(1, 'Name is required.')
    .max(64, 'Maximum 64 characters allowed.')
    .optional(),
  tags: z
    .array(
      z.string({
        required_error: 'Tags are required',
        invalid_type_error: 'Tags must be an array of strings',
      })
    )
    .optional(),
  priority: z.nativeEnum(Priority, {
    required_error: 'Priority is required',
    invalid_type_error: 'Priority must be a string',
  }),
  scheduleDate: z
    .date({
      required_error: 'Schedule date is required',
      invalid_type_error: 'Schedule date must be a date',
    })
    .optional(),
})

export type AddTaskSchema = z.infer<typeof addTaskSchema>
