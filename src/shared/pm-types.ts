// ─── PM Domain Types ───

export type IssueStatus = 'todo' | 'in_progress' | 'done' | 'cancelled'
export type IssuePriority = 'urgent' | 'high' | 'medium' | 'low' | 'none'

export interface Project {
  id: string
  name: string
  description: string | null
  githubOwner: string | null
  githubRepo: string | null
  color: string
  icon: string | null
  createdAt: string
  updatedAt: string
}

export interface Label {
  id: string
  projectId: string
  name: string
  color: string
}

export interface Issue {
  id: string
  projectId: string
  number: number
  title: string
  description: string | null
  status: IssueStatus
  priority: IssuePriority
  assignee: string | null
  githubIssueNumber: number | null
  githubPrNumber: number | null
  githubNodeId: string | null
  syncedAt: string | null
  createdAt: string
  updatedAt: string
  labels?: Label[]
}

export interface Comment {
  id: string
  issueId: string
  body: string
  author: string | null
  createdAt: string
}

// ─── IPC Payload Types ───

export interface CreateProjectInput {
  name: string
  description?: string
  githubOwner?: string
  githubRepo?: string
  color?: string
  icon?: string
}

export interface CreateIssueInput {
  projectId: string
  title: string
  description?: string
  status?: IssueStatus
  priority?: IssuePriority
  assignee?: string
  labelIds?: string[]
}

export interface IssueFilters {
  status?: IssueStatus | IssueStatus[]
  priority?: IssuePriority
  search?: string
  labelId?: string
}

export interface SyncProgress {
  phase: 'fetching' | 'processing' | 'pushing' | 'done' | 'error'
  current: number
  total: number
  message: string
}

export interface SyncResult {
  created: number
  updated: number
  pushed: number
  errors: string[]
}
