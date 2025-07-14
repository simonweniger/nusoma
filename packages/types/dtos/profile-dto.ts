import type { WorkspaceMemberRole } from '@nusoma/database/schema'

type ActiveWorkspacePermissions = {
  isOwner: boolean
  role: WorkspaceMemberRole
}

export type ProfileDto = ActiveWorkspacePermissions & {
  id: string
  name: string
  image?: string
}
