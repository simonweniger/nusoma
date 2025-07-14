import type { Priority, ProjectStage } from '@nusoma/database/schema'
import type { TagDto } from './tag-dto'

export type ProjectDto = {
  id: string
  priority: Priority
  name: string
  description?: string | null
  stage: ProjectStage
  createdAt: Date
  tags: TagDto[]
}
