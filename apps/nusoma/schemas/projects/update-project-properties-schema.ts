import { Priority, ProjectStage } from '@nusoma/database/schema'
import { z } from 'zod'

export const updateProjectPropertiesSchema = z.object({
  id: z
    .string({
      required_error: 'Id is required.',
      invalid_type_error: 'Id must be a string.',
    })
    .trim()
    .uuid('Id is invalid.')
    .min(1, 'Id is required.')
    .max(36, 'Maximum 36 characters allowed.'),
  stage: z.nativeEnum(ProjectStage, {
    required_error: 'Stage is required',
    invalid_type_error: 'Stage must be a string',
  }),
  priority: z.nativeEnum(Priority, {
    required_error: 'Priority is required',
    invalid_type_error: 'Priority must be a string',
  }),
  name: z
    .string({
      required_error: 'Name is required.',
      invalid_type_error: 'Name must be a string.',
    })
    .trim()
    .min(1, 'Name is required.')
    .max(64, 'Maximum 64 characters allowed.'),
  description: z
    .string({
      required_error: 'Description is required.',
      invalid_type_error: 'Description must be a string.',
    })
    .trim()
    .min(1, 'Description is required.')
    .max(255, 'Maximum 255 characters allowed.'),
})

export type UpdateProjectPropertiesSchema = z.infer<typeof updateProjectPropertiesSchema>
