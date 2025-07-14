import type { Workspace } from '@nusoma/database/schema'

export interface WorkspaceMemberDTO extends Workspace {
  id: string
  name: string
  image: string
  email: string
  joinedAt: Date
  role: string
}
