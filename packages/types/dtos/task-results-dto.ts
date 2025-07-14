export type TaskResultDto = {
  id: string
  projectId: string
  rawResult: Record<string, any>
  resultContent: string
  //resultMdx: string
  type: 'result'
  createdAt: Date
  updatedAt: Date
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

export type TaskResultsCommentDto = TaskResultDto | CommentTimelineEventDto
