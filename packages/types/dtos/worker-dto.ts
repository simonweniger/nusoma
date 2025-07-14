import type { WorkerRecord, WorkerStage } from '@nusoma/database/schema'
import type { TagDto } from '@nusoma/types/dtos/tag-dto'

export type WorkerDto = {
  id: string
  organizationId: string
  workspaceId: string
  createdBy: string
  record: WorkerRecord
  image?: string
  name: string
  email?: string
  phone?: string
  address?: string
  stage: WorkerStage
  createdAt: Date
  systemPrompt?: string
  model?: string
  temperature?: number
  tags: TagDto[]
  workerId?: string
  workerName?: string
}
