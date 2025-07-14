import type { TaskDto } from '@nusoma/types/dtos/task-dto'

export interface TaskWithProjectAndWorker extends TaskDto {
  project: {
    id: string
    name: string
    workspaceId: string
    workspaceName: string
  }
  assignedWorker?: {
    id: string
    name: string
    color: string
    isDeployed: boolean
  }
}
