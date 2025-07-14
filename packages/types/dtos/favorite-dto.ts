import type { Priority, ProjectStage, TaskStatus } from '@nusoma/database/schema'

export type FavoriteDto = {
  id: string
  order: number
  projectId?: string
  taskId?: string
  name: string
  description?: string
  workspaceId?: string
  stage?: ProjectStage
  priority?: Priority
  status?: TaskStatus
}
