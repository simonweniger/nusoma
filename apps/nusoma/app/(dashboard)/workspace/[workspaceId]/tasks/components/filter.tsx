'use client'

import { useState } from 'react'
import type { Priority, TaskStatus } from '@nusoma/database/schema'
import { Avatar, AvatarFallback } from '@nusoma/design-system/components/ui/avatar'
import { Button } from '@nusoma/design-system/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@nusoma/design-system/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@nusoma/design-system/components/ui/popover'
import type { UserTaskWithProject } from '@nusoma/types/dtos/user-task-dto'
import {
  BarChart3,
  Bot,
  CheckIcon,
  ChevronRight,
  CircleCheck,
  Folder,
  ListFilter,
  Tag,
  User,
} from 'lucide-react'
import { getAllPriorities, priorityConfig } from '@/lib/task-priority'
import { getAllStatuses, statusConfig } from '@/lib/task-status'
import { useFilters } from '@/hooks/use-filters'

// Define filter types
type FilterType = 'status' | 'assignee' | 'priority' | 'labels' | 'project'

interface FilterProps {
  /** Tasks to filter */
  tasks: UserTaskWithProject[]
}

export function Filter({ tasks }: FilterProps) {
  const [open, setOpen] = useState<boolean>(false)
  const [activeFilter, setActiveFilter] = useState<FilterType | null>(null)

  const { filters, toggleFilter, clearFilters, getActiveFiltersCount } = useFilters()

  // Ensure tasks is always an array to prevent runtime errors
  const safeTasks = tasks || []

  // Helper functions to count tasks for each filter option
  const getTaskCountByStatus = (status: TaskStatus) => {
    return safeTasks.filter((task) => task.status === status).length
  }

  const getTaskCountByPriority = (priority: Priority) => {
    return safeTasks.filter((task) => task.priority === priority).length
  }

  const getTaskCountByAssignee = (assigneeId: string | null) => {
    if (assigneeId === null) {
      return safeTasks.filter((task) => !task.assigneeId).length
    }
    return safeTasks.filter((task) => task.assigneeId === assigneeId).length
  }

  const getTaskCountByLabel = (label: string) => {
    return safeTasks.filter((task) => task.tags?.some((tag) => tag.text === label)).length
  }

  const getTaskCountByProject = (projectId: string) => {
    return safeTasks.filter((task) => task.project?.id === projectId).length
  }

  // Get unique labels from all tasks (using tags.text)
  const uniqueLabels = Array.from(
    new Set(safeTasks.flatMap((task) => task.tags?.map((tag) => tag.text) || []))
  )

  // Get unique projects from all tasks
  const uniqueProjects = Array.from(
    new Map(
      safeTasks
        .filter((task) => task.project !== null)
        .map((task) => [task.project?.id, task.project!])
    ).values()
  )

  // Get unique assignees from all tasks (worker IDs for now)
  const uniqueAssignees = Array.from(
    new Set(safeTasks.map((task) => task.assigneeId).filter((id): id is string => Boolean(id)))
  ).map((id) => ({ id, name: `Worker ${id.slice(-6)}` }))

  const allStatuses = getAllStatuses()
  const allPriorities = getAllPriorities()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size='xs' variant='ghost' className='relative'>
          <ListFilter className='mr-1 size-4' />
          Filter
          {getActiveFiltersCount() > 0 && (
            <span className='-top-1 -right-1 absolute flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground'>
              {getActiveFiltersCount()}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-60 p-0' align='start'>
        {activeFilter === null ? (
          <Command>
            <CommandList>
              <CommandGroup>
                <CommandItem
                  onSelect={() => setActiveFilter('status')}
                  className='flex cursor-pointer items-center justify-between'
                >
                  <span className='flex items-center gap-2'>
                    <CircleCheck className='size-4 text-muted-foreground' />
                    Status
                  </span>
                  <div className='flex items-center'>
                    {filters.status.length > 0 && (
                      <span className='mr-1 text-muted-foreground text-xs'>
                        {filters.status.length}
                      </span>
                    )}
                    <ChevronRight className='size-4' />
                  </div>
                </CommandItem>
                <CommandItem
                  onSelect={() => setActiveFilter('assignee')}
                  className='flex cursor-pointer items-center justify-between'
                >
                  <span className='flex items-center gap-2'>
                    <User className='size-4 text-muted-foreground' />
                    Assignee
                  </span>
                  <div className='flex items-center'>
                    {filters.assignee.length > 0 && (
                      <span className='mr-1 text-muted-foreground text-xs'>
                        {filters.assignee.length}
                      </span>
                    )}
                    <ChevronRight className='size-4' />
                  </div>
                </CommandItem>
                <CommandItem
                  onSelect={() => setActiveFilter('priority')}
                  className='flex cursor-pointer items-center justify-between'
                >
                  <span className='flex items-center gap-2'>
                    <BarChart3 className='size-4 text-muted-foreground' />
                    Priority
                  </span>
                  <div className='flex items-center'>
                    {filters.priority.length > 0 && (
                      <span className='mr-1 text-muted-foreground text-xs'>
                        {filters.priority.length}
                      </span>
                    )}
                    <ChevronRight className='size-4' />
                  </div>
                </CommandItem>
                <CommandItem
                  onSelect={() => setActiveFilter('labels')}
                  className='flex cursor-pointer items-center justify-between'
                >
                  <span className='flex items-center gap-2'>
                    <Tag className='size-4 text-muted-foreground' />
                    Labels
                  </span>
                  <div className='flex items-center'>
                    {filters.labels.length > 0 && (
                      <span className='mr-1 text-muted-foreground text-xs'>
                        {filters.labels.length}
                      </span>
                    )}
                    <ChevronRight className='size-4' />
                  </div>
                </CommandItem>
                <CommandItem
                  onSelect={() => setActiveFilter('project')}
                  className='flex cursor-pointer items-center justify-between'
                >
                  <span className='flex items-center gap-2'>
                    <Folder className='size-4 text-muted-foreground' />
                    Project
                  </span>
                  <div className='flex items-center'>
                    {filters.project.length > 0 && (
                      <span className='mr-1 text-muted-foreground text-xs'>
                        {filters.project.length}
                      </span>
                    )}
                    <ChevronRight className='size-4' />
                  </div>
                </CommandItem>
              </CommandGroup>
              {getActiveFiltersCount() > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem onSelect={() => clearFilters()} className='text-destructive'>
                      Clear all filters
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        ) : activeFilter === 'status' ? (
          <Command>
            <div className='flex items-center border-b p-2'>
              <Button
                variant='ghost'
                size='icon'
                className='size-6'
                onClick={() => setActiveFilter(null)}
              >
                <ChevronRight className='size-4 rotate-180' />
              </Button>
              <span className='ml-2 font-medium'>Status</span>
            </div>
            <CommandInput placeholder='Search status...' />
            <CommandList>
              <CommandEmpty>No status found.</CommandEmpty>
              <CommandGroup>
                {allStatuses.map((status) => {
                  const config = statusConfig[status]
                  const StatusIcon = config.icon
                  return (
                    <CommandItem
                      key={status}
                      value={config.id}
                      onSelect={() => toggleFilter('status', status)}
                      className='flex items-center justify-between'
                    >
                      <div className='flex items-center gap-2'>
                        <StatusIcon />
                        {config.name}
                      </div>
                      {filters.status.includes(status) && (
                        <CheckIcon size={16} className='ml-auto' />
                      )}
                      <span className='text-muted-foreground text-xs'>
                        {getTaskCountByStatus(status)}
                      </span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        ) : activeFilter === 'assignee' ? (
          <Command>
            <div className='flex items-center border-b p-2'>
              <Button
                variant='ghost'
                size='icon'
                className='size-6'
                onClick={() => setActiveFilter(null)}
              >
                <ChevronRight className='size-4 rotate-180' />
              </Button>
              <span className='ml-2 font-medium'>Assignee</span>
            </div>
            <CommandInput placeholder='Search assignee...' />
            <CommandList>
              <CommandEmpty>No assignees found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value='unassigned'
                  onSelect={() => toggleFilter('assignee', 'unassigned')}
                  className='flex items-center justify-between'
                >
                  <div className='flex items-center gap-2'>
                    <User className='size-5' />
                    Unassigned
                  </div>
                  {filters.assignee.includes('unassigned') && (
                    <CheckIcon size={16} className='ml-auto' />
                  )}
                  <span className='text-muted-foreground text-xs'>
                    {getTaskCountByAssignee(null)}
                  </span>
                </CommandItem>
                {uniqueAssignees.map((assignee) => (
                  <CommandItem
                    key={assignee.id}
                    value={assignee.id}
                    onSelect={() => toggleFilter('assignee', assignee.id)}
                    className='flex items-center justify-between'
                  >
                    <div className='flex items-center gap-2'>
                      <Avatar className='size-5'>
                        <AvatarFallback className='bg-blue-500'>
                          <Bot className='size-3' />
                        </AvatarFallback>
                      </Avatar>
                      {assignee.name}
                    </div>
                    {filters.assignee.includes(assignee.id) && (
                      <CheckIcon size={16} className='ml-auto' />
                    )}
                    <span className='text-muted-foreground text-xs'>
                      {getTaskCountByAssignee(assignee.id)}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        ) : activeFilter === 'priority' ? (
          <Command>
            <div className='flex items-center border-b p-2'>
              <Button
                variant='ghost'
                size='icon'
                className='size-6'
                onClick={() => setActiveFilter(null)}
              >
                <ChevronRight className='size-4 rotate-180' />
              </Button>
              <span className='ml-2 font-medium'>Priority</span>
            </div>
            <CommandInput placeholder='Search priority...' />
            <CommandList>
              <CommandEmpty>No priorities found.</CommandEmpty>
              <CommandGroup>
                {allPriorities.map((priority) => {
                  const config = priorityConfig[priority]
                  const PriorityIcon = config.icon
                  return (
                    <CommandItem
                      key={priority}
                      value={config.id}
                      onSelect={() => toggleFilter('priority', priority)}
                      className='flex items-center justify-between'
                    >
                      <div className='flex items-center gap-2'>
                        <PriorityIcon />
                        {config.name}
                      </div>
                      {filters.priority.includes(priority) && (
                        <CheckIcon size={16} className='ml-auto' />
                      )}
                      <span className='text-muted-foreground text-xs'>
                        {getTaskCountByPriority(priority)}
                      </span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        ) : activeFilter === 'labels' ? (
          <Command>
            <div className='flex items-center border-b p-2'>
              <Button
                variant='ghost'
                size='icon'
                className='size-6'
                onClick={() => setActiveFilter(null)}
              >
                <ChevronRight className='size-4 rotate-180' />
              </Button>
              <span className='ml-2 font-medium'>Labels</span>
            </div>
            <CommandInput placeholder='Search labels...' />
            <CommandList>
              <CommandEmpty>No labels found.</CommandEmpty>
              <CommandGroup>
                {uniqueLabels.map((label) => (
                  <CommandItem
                    key={label}
                    value={label}
                    onSelect={() => toggleFilter('labels', label)}
                    className='flex items-center justify-between'
                  >
                    <div className='flex items-center gap-2'>
                      <span className='size-3 rounded-full bg-blue-500' />
                      {label}
                    </div>
                    {filters.labels.includes(label) && <CheckIcon size={16} className='ml-auto' />}
                    <span className='text-muted-foreground text-xs'>
                      {getTaskCountByLabel(label)}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        ) : activeFilter === 'project' ? (
          <Command>
            <div className='flex items-center border-b p-2'>
              <Button
                variant='ghost'
                size='icon'
                className='size-6'
                onClick={() => setActiveFilter(null)}
              >
                <ChevronRight className='size-4 rotate-180' />
              </Button>
              <span className='ml-2 font-medium'>Project</span>
            </div>
            <CommandInput placeholder='Search projects...' />
            <CommandList>
              <CommandEmpty>No projects found.</CommandEmpty>
              <CommandGroup>
                {uniqueProjects.map((project) => (
                  <CommandItem
                    key={project.id}
                    value={project.id}
                    onSelect={() => toggleFilter('project', project.id)}
                    className='flex items-center justify-between'
                  >
                    <div className='flex items-center gap-2'>
                      <Folder className='size-4' />
                      {project.name}
                    </div>
                    {filters.project.includes(project.id) && (
                      <CheckIcon size={16} className='ml-auto' />
                    )}
                    <span className='text-muted-foreground text-xs'>
                      {getTaskCountByProject(project.id)}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
