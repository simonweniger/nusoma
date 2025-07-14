import type { Priority, TaskStatus } from '@nusoma/database/schema'
import type { TagDto } from './tag-dto'

export type TaskDto = {
  id: string
  workspaceId: string
  projectId?: string | null
  title: string
  description?: string | null
  status: TaskStatus
  assigneeId?: string | null
  chatId?: string | null
  priority: Priority
  tags: TagDto[]
  scheduleDate?: Date | null
  createdAt: Date
  updatedAt: Date
  projectName?: string | null
  projectWorkspaceId?: string | null
  projectWorkspaceName?: string | null
  workerId?: string | null
  workerName?: string | null
  workerColor?: string | null
  workerIsDeployed?: boolean | null
  resultReport?: string | null
  rawResult?: any | null
  project: {
    id: string
    name: string
    workspaceId: string
    workspaceName: string
  } | null
}
