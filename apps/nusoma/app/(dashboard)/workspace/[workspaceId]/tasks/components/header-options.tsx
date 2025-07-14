'use client'

import { useMemo } from 'react'
import { Button } from '@nusoma/design-system/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@nusoma/design-system/components/ui/dropdown-menu'
import { cn } from '@nusoma/design-system/lib/utils'
import type { UserTaskWithProject } from '@nusoma/types/dtos/user-task-dto'
import { LayoutGrid, LayoutList, SlidersHorizontal } from 'lucide-react'
import { useViewStore, type ViewType } from '@/stores/view-store'
import { Filter } from './filter'

interface HeaderOptionsProps {
  workspaceId: string
  allTasks: UserTaskWithProject[]
}

export default function HeaderOptions({ workspaceId, allTasks }: HeaderOptionsProps) {
  const { viewType, setViewType } = useViewStore()

  // Ensure allTasks is always an array to prevent runtime errors
  const safeTasks = Array.isArray(allTasks) ? allTasks : []

  // Filter tasks to only show tasks from the current workspace
  const workspaceTasks = useMemo(() => {
    return safeTasks.filter((task) => task.project && task.project.workspaceId === workspaceId)
  }, [safeTasks, workspaceId])

  const handleViewChange = (type: ViewType) => {
    setViewType(type)
  }

  return (
    <div className='flex h-10 w-full items-center justify-between border-b px-6 py-1.5'>
      <Filter tasks={workspaceTasks || []} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className='relative' size='xs' variant='secondary'>
            <SlidersHorizontal className='mr-1 size-4' />
            Display
            {viewType === 'grid' && (
              <span className='absolute top-0 right-0 h-2 w-2 rounded-full bg-orange-500' />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className='flex w-72 gap-2 p-3' align='end'>
          <DropdownMenuItem
            onClick={() => handleViewChange('list')}
            className={cn(
              'flex w-full flex-col gap-1 border border-accent text-xs',
              viewType === 'list' ? 'bg-accent' : ''
            )}
          >
            <LayoutList className='size-4' />
            List
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleViewChange('grid')}
            className={cn(
              'flex w-full flex-col gap-1 border border-accent text-xs',
              viewType === 'grid' ? 'bg-accent' : ''
            )}
          >
            <LayoutGrid className='size-4' />
            Board
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
