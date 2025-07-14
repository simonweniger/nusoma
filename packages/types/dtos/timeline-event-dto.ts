import type { ActionType } from '@nusoma/database/schema'

export type ActivityTimelineEventDto = {
  id: string
  projectId: string
  type: 'activity'
  actionType: ActionType
  metadata: unknown
  occurredAt: Date
  actor: {
    id: string
    name: string
    image?: string
  }
}

export type CommentTimelineEventDto = {
  id: string
  projectId: string
  type: 'comment'
  text: string
  edited: boolean
  createdAt: Date
  updatedAt: Date
  sender: {
    id: string
    name: string
    image?: string
  }
}

export type BlockExecutionTimelineEventDto = {
  id: string
  projectId: string
  type: 'block-execution'
  executionId: string
  totalBlocks: number
  failedBlocks: number
  successfulBlocks: number
  occurredAt: Date
  actor: {
    id: string
    name: string
    image?: string
  }
}

export type TimelineEventDto = ActivityTimelineEventDto | BlockExecutionTimelineEventDto
