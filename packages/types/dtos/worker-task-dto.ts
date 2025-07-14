import type { WorkerTaskStatus } from '@workspace/database/schema'

export type WorkerTaskDto = {
  id: string
  workerId?: string
  title: string
  description?: string
  status: WorkerTaskStatus
  dueDate?: Date
  createdAt: Date
}
