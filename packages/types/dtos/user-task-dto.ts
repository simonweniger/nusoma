import type { TaskDto } from './task-dto'

export interface UserTaskWithProject extends TaskDto {
  workspaceId: string
  project: {
    id: string
    name: string
    workspaceId: string
    workspaceName: string
  } | null
}
