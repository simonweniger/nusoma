import { Priority, ProjectStage } from '@nusoma/database/schema'
import { z } from 'zod'

export const addProjectSchema = z.object({
  priority: z.nativeEnum(Priority, {
    required_error: 'Record is required',
    invalid_type_error: 'Record must be a string',
  }),
  stage: z.nativeEnum(ProjectStage, {
    required_error: 'Stage is required',
    invalid_type_error: 'Stage must be a string',
  }),
  name: z
    .string({
      required_error: 'Name is required.',
      invalid_type_error: 'Name must be a string.',
    })
    .trim()
    .min(1, 'Name is required.')
    .max(64, 'Maximum 64 characters allowed.'),
  description: z.string().optional(),
  createdBy: z.string({
    required_error: 'Created by is required',
    invalid_type_error: 'Created by must be a string',
  }),
  workspaceId: z.string({
    required_error: 'Workspace ID is required',
    invalid_type_error: 'Workspace ID must be a string',
  }),
})

export type AddProjectSchema = z.infer<typeof addProjectSchema>
