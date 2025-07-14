import type { Workspace } from '@nusoma/database/schema'

export interface WorkspaceDTO extends Workspace {
  id: string
  name: string
  ownerId: string
  joined: boolean
  icon: string
  color: string
  role?: string
  members: any[]
  projects: any[]
}
