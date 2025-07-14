'use client'

import { useTasks } from '@/hooks/use-tasks-api'
import { useSearchStore } from '@/stores/search-store'
import Header from './header'
import { SearchTasks } from './search-tasks'
import WorkspaceTasks from './workspace-tasks'

interface TasksClientProps {
  workspaceId: string
  workerId?: string
}

export function TasksClient({ workspaceId, workerId }: TasksClientProps) {
  const { isSearchOpen } = useSearchStore()

  // Use TanStack Query to fetch tasks
  const { data: tasks = [], isLoading, error } = useTasks(workspaceId)

  if (error) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='text-center'>
          <h2 className='font-semibold text-foreground text-lg'>Failed to load tasks</h2>
          <p className='text-muted-foreground text-sm'>Please try refreshing the page</p>
        </div>
      </div>
    )
  }

  return (
    <div className='h-svh w-full overflow-y-auto'>
      <Header workspaceId={workspaceId} tasks={tasks} />
      <div className='relative h-[calc(100vh-80px)]'>
        {/* Main tasks view */}
        <div
          className={`transition-opacity duration-200 ${isSearchOpen ? 'opacity-30' : 'opacity-100'}`}
        >
          <WorkspaceTasks
            workspaceId={workspaceId}
            tasks={tasks}
            workerId={workerId}
            isLoading={isLoading}
          />
        </div>

        {/* Search overlay */}
        {isSearchOpen && (
          <div className='absolute top-0 left-0 z-10 h-full w-full bg-background p-4'>
            <SearchTasks tasks={tasks} />
          </div>
        )}
      </div>
    </div>
  )
}
