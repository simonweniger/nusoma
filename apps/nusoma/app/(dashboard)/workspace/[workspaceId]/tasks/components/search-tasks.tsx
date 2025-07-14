'use client'

import { useEffect, useState } from 'react'
import { TaskStatus } from '@nusoma/database/schema'
import { Badge } from '@nusoma/design-system/components/ui/badge'
import { ContextMenu, ContextMenuTrigger } from '@nusoma/design-system/components/ui/context-menu'
import type { TaskDto } from '@nusoma/types/dtos/task-dto'
import type { UserTaskWithProject } from '@nusoma/types/dtos/user-task-dto'
import { format } from 'date-fns'
import { motion } from 'motion/react'
import { useSearchStore } from '@/stores/search-store'
import { AssignWorker } from './assign-worker'
import { PrioritySelector } from './priority-selector'
import { StatusLabel } from './status-label'

interface SearchTasksProps {
  tasks: (TaskDto | UserTaskWithProject)[]
}

export function SearchTasks({ tasks }: SearchTasksProps) {
  const [searchResults, setSearchResults] = useState<(TaskDto | UserTaskWithProject)[]>([])
  const { searchQuery, isSearchOpen } = useSearchStore()

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([])
      return
    }

    // Search through all available tasks
    const results = tasks.filter((task) => {
      const query = searchQuery.toLowerCase()
      return (
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.id.toLowerCase().includes(query) ||
        task.tags?.some((tag) => tag.text.toLowerCase().includes(query))
      )
    })
    setSearchResults(results)
  }, [searchQuery, tasks.length])

  if (!isSearchOpen) {
    return null
  }

  return (
    <div className='w-full'>
      <div className='mb-4 text-muted-foreground text-xs'>
        Searching through {tasks.length} tasks
      </div>

      {searchQuery.trim() !== '' && (
        <div>
          {searchResults.length > 0 ? (
            <div className='mt-4 rounded-md border'>
              <div className='border-b bg-muted/50 px-4 py-2'>
                <h3 className='font-medium text-sm'>Results ({searchResults.length})</h3>
              </div>
              <div className='divide-y'>
                {searchResults.map((task) => {
                  // Handle both TaskDto and UserTaskWithProject types
                  const projectId =
                    'projectId' in task
                      ? task.projectId || ''
                      : 'project' in task
                        ? task.project?.id || ''
                        : ''

                  return (
                    <ContextMenu key={task.id}>
                      <ContextMenuTrigger asChild>
                        <motion.div
                          key={`task-line-${task.id}`}
                          className='flex h-11 w-full items-center justify-start px-6 hover:bg-sidebar/50'
                        >
                          <div className='flex items-center gap-0.5'>
                            <PrioritySelector
                              priority={task.priority}
                              taskId={task.id}
                              projectId={projectId}
                              status={TaskStatus.TODO}
                            />
                            <span className='mr-0.5 hidden w-[66px] shrink-0 truncate font-medium text-muted-foreground text-sm sm:inline-block'>
                              #{task.id.slice(-6)}
                            </span>
                            <StatusLabel status={task.status} />
                          </div>
                          <span className='mr-1 ml-0.5 flex min-w-0 items-center justify-start'>
                            <span className='truncate font-medium text-xs sm:font-semibold sm:text-sm'>
                              {task.title}
                            </span>
                          </span>
                          <div className='ml-auto flex items-center justify-end gap-2 sm:w-fit'>
                            <AssignWorker
                              taskId={task.id}
                              projectId={projectId}
                              assigneeId={task.assigneeId}
                              workspaceId={task.workspaceId || ''}
                            />
                            <div className='w-3 shrink-0' />
                            <div className='-space-x-5 hidden items-center justify-end transition-all duration-200 hover:space-x-1 sm:flex lg:space-x-1'>
                              {task.tags && task.tags.length > 0 && (
                                <div className='flex gap-1'>
                                  {task.tags.map((tag, index) => (
                                    <Badge
                                      key={index}
                                      variant='outline'
                                      className='px-2 py-0 text-xs'
                                    >
                                      {tag.text}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <span className='hidden shrink-0 text-muted-foreground text-xs sm:inline-block'>
                              {format(new Date(task.createdAt), 'MMM dd')}
                            </span>
                          </div>
                        </motion.div>
                      </ContextMenuTrigger>
                    </ContextMenu>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className='py-8 text-center text-muted-foreground'>
              No results found for &quot;{searchQuery}&quot;
            </div>
          )}
        </div>
      )}

      {searchQuery.trim() === '' && (
        <div className='py-8 text-center text-muted-foreground'>
          Start typing to search tasks...
        </div>
      )}
    </div>
  )
}
