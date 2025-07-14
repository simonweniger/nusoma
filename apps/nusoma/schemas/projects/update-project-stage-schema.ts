import { ProjectStage } from '@nusoma/database/schema'
import { z } from 'zod'

export const updateProjectStageSchema = z.object({
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
})

export type UpdateProjectStageSchema = z.infer<typeof updateProjectStageSchema>
