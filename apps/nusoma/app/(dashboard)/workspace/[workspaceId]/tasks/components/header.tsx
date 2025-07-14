import type { UserTaskWithProject } from '@nusoma/types/dtos/user-task-dto'
import HeaderNav from './header-nav'
import HeaderOptions from './header-options'

interface HeaderProps {
  workspaceId: string
  tasks: UserTaskWithProject[]
}

export default function Header({ workspaceId, tasks }: HeaderProps) {
  return (
    <div className='flex w-full flex-col items-center'>
      <HeaderNav workspaceId={workspaceId} />
      <HeaderOptions workspaceId={workspaceId} allTasks={tasks} />
    </div>
  )
}
