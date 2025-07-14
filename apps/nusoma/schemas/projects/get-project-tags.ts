import { z } from 'zod'

export const getProjectTagsSchema = z.object({
  workspaceId: z.string().min(1, 'Workspace ID is required'),
})

export type GetProjectTagsSchema = z.infer<typeof getProjectTagsSchema>
