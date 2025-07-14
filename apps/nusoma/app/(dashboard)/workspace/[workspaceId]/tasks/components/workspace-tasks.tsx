'use client'

import { type FC, useMemo } from 'react'
import { Priority, TaskStatus } from '@nusoma/database/schema'
import { Badge } from '@nusoma/design-system/components/ui/badge'
import { ContextMenu, ContextMenuTrigger } from '@nusoma/design-system/components/ui/context-menu'
import { Spinner } from '@nusoma/design-system/components/ui/spinner'
import { cn } from '@nusoma/design-system/lib/utils'
import type { UserTaskWithProject } from '@nusoma/types/dtos/user-task-dto'
import { format } from 'date-fns'
import { motion } from 'motion/react'
import Link from 'next/link'
import { getAllStatuses, statusConfig } from '@/lib/task-status'
import { StatusLabel } from '@/app/(dashboard)/workspace/[workspaceId]/tasks/components/status-label'
import { useFilters } from '@/hooks/use-filters'
import { useUpdateTask } from '@/hooks/use-tasks-api'
import { useViewStore } from '@/stores/view-store'
import { AssignWorker } from './assign-worker'
import { PrioritySelector } from './priority-selector'
import { ProjectBadge } from './project-badge'
import { TaskContextMenu } from './tasks-context-menu'

interface WorkspaceTasksProps {
  workspaceId: string
  tasks: UserTaskWithProject[]
  workerId?: string
  isLoading?: boolean
}

export default function WorkspaceTasks({
  workspaceId,
  tasks,
  workerId,
  isLoading,
}: WorkspaceTasksProps) {
  const { viewType } = useViewStore()
  const { filters } = useFilters()
  const allStatuses = getAllStatuses()
  const updateTaskMutation = useUpdateTask()

  // Filter tasks to only show tasks from the current workspace
  const workspaceTasks = useMemo(() => {
    return tasks.filter((task) => {
      // For workspace view, we show tasks that belong to this workspace
      // either directly or through their project
      return (
        task.workspaceId === workspaceId ||
        (task.project && task.project.workspaceId === workspaceId)
      )
    })
  }, [tasks, workspaceId])

  // Apply filters to workspace tasks
  const filteredTasks = useMemo(() => {
    let filteredTasks = workspaceTasks

    // If a workerId is provided, pre-filter tasks for that worker.
    if (workerId) {
      filteredTasks = filteredTasks.filter((task) => task.assigneeId === workerId)
    }

    // Apply status filter
    if (filters.status.length > 0) {
      filteredTasks = filteredTasks.filter((task) => filters.status.includes(task.status))
    }

    // Apply priority filter
    if (filters.priority.length > 0) {
      filteredTasks = filteredTasks.filter((task) => filters.priority.includes(task.priority))
    }

    // Apply project filter
    if (filters.project.length > 0) {
      filteredTasks = filteredTasks.filter(
        (task) => task.project && filters.project.includes(task.project.id)
      )
    }

    // Apply assignee filter only if no specific workerId is being displayed
    if (!workerId && filters.assignee.length > 0) {
      filteredTasks = filteredTasks.filter((task) => {
        if (filters.assignee.includes('unassigned') && !task.assigneeId) {
          return true
        }
        return task.assigneeId && filters.assignee.includes(task.assigneeId)
      })
    }

    // Apply tags filter
    if (filters.labels.length > 0) {
      filteredTasks = filteredTasks.filter((task) =>
        task.tags?.some((tag) => filters.labels.includes(tag.text))
      )
    }

    return filteredTasks
  }, [
    workspaceTasks,
    filters.status,
    filters.priority,
    filters.project,
    filters.assignee,
    filters.labels,
    workerId,
  ])

  // Group filtered tasks by status
  const tasksByStatus = useMemo(() => {
    const tasksByStatus: Record<TaskStatus, UserTaskWithProject[]> = {
      [TaskStatus.TODO]: [],
      [TaskStatus.IN_PROGRESS]: [],
      [TaskStatus.WORK_COMPLETE]: [],
      [TaskStatus.HUMAN_NEEDED]: [],
      [TaskStatus.REVIEWED]: [],
      [TaskStatus.ERROR]: [],
    }

    filteredTasks.forEach((task: UserTaskWithProject) => {
      tasksByStatus[task.status].push(task)
    })

    return tasksByStatus
  }, [filteredTasks])

  const handleTaskStatusUpdate = async (
    taskId: string,
    _projectId: string | undefined,
    newStatus: TaskStatus
  ) => {
    updateTaskMutation.mutate({
      taskId,
      data: { status: newStatus },
    })
  }

  const isViewTypeGrid = viewType === 'grid'

  // Show loading state (moved after all hooks)
  if (isLoading) {
    return (
      <div className='flex h-full w-full flex-row items-center justify-center gap-2'>
        <Spinner size='small' />
        <p className='text-muted-foreground text-sm'>Loading tasks...</p>
      </div>
    )
  }

  return (
    <div className='h-full w-full'>
      {/* Header with task count */}
      {/* <div className='flex h-14 flex-row items-center justify-between gap-2 border-b px-6'>
        <h1 className='font-semibold text-sm'>
          Workspace tasks{' '}
          <span className='text-muted-foreground'>
            ({filteredTasks.length}
            {filteredTasks.length !== workspaceTasks.length ? ` of ${workspaceTasks.length}` : ''})
          </span>
        </h1>
      </div> */}

      {/* Tasks Content */}
      <div className='h-[calc(100%-3.5rem)]'>
        <div className={cn('h-full w-full', isViewTypeGrid && 'overflow-x-auto')}>
          <div className={cn(isViewTypeGrid && 'flex h-full min-w-max gap-3 px-2 py-2')}>
            {allStatuses.map((status) => (
              <WorkspaceTaskGroupTasks
                key={status}
                status={status}
                tasks={tasksByStatus[status] || []}
                count={tasksByStatus[status]?.length || 0}
                workspaceId={workspaceId}
                onTaskStatusUpdate={handleTaskStatusUpdate}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Workspace Task Line component
const WorkspaceTaskLine: FC<{
  task: UserTaskWithProject
  workspaceId: string
  onStatusUpdate: (
    taskId: string,
    projectId: string | undefined,
    newStatus: TaskStatus
  ) => Promise<void>
}> = ({ task, workspaceId, onStatusUpdate }) => {
  const handleLinkClick = (e: React.MouseEvent) => {
    // Check if the click target is an interactive element or its child
    const target = e.target as HTMLElement
    const interactiveSelectors = [
      '[data-priority-selector]',
      '[data-status-selector]',
      '[data-assignee-agent]',
      'button',
      '[role="button"]',
      '[role="combobox"]',
      '[role="menuitem"]',
    ]

    // Check if the clicked element or any of its parents match interactive selectors
    for (const selector of interactiveSelectors) {
      if (target.closest(selector)) {
        e.preventDefault()
        return
      }
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className='hover:bg-sidebar/50'>
          <Link href={`/workspace/${workspaceId}/tasks/${task.id}`} onClick={handleLinkClick}>
            <motion.div className='flex h-11 w-full cursor-pointer items-center justify-start px-6'>
              <div className='flex items-center gap-2'>
                <div data-priority-selector>
                  <PrioritySelector
                    priority={task.priority}
                    taskId={task.id}
                    projectId={task.project?.id}
                    status={task.status}
                  />
                </div>
                <span className='mr-2 hidden w-[66px] shrink-0 truncate font-medium text-muted-foreground text-sm sm:inline-block'>
                  #{task.id.slice(-6)}
                </span>
                <div data-status-selector>
                  <StatusLabel status={task.status} />
                </div>
              </div>

              <span className='mr-1 ml-2 flex min-w-0 items-center justify-start'>
                <span className='truncate font-medium text-xs sm:font-semibold sm:text-sm'>
                  {task.title}
                </span>
              </span>

              <div className='ml-auto flex items-center justify-end gap-2'>
                <div data-assignee-agent>
                  <AssignWorker
                    taskId={task.id}
                    workspaceId={workspaceId}
                    projectId={task.project?.id}
                    assigneeId={task.assigneeId}
                  />
                </div>

                {task.project && (
                  <ProjectBadge
                    project={{
                      id: task.project.id,
                      name: task.project.name,
                      workspaceId: task.project.workspaceId,
                      workspaceName: task.project.workspaceName,
                    }}
                  />
                )}

                {task.tags && task.tags.length > 0 && (
                  <div className='flex gap-1'>
                    {task.tags.map((tag, index) => (
                      <Badge key={index} variant='outline' className='px-2 py-0 text-xs'>
                        {tag.text}
                      </Badge>
                    ))}
                  </div>
                )}

                <span className='hidden shrink-0 text-muted-foreground text-xs sm:inline-block'>
                  {format(new Date(task.createdAt), 'MMM dd')}
                </span>
              </div>
            </motion.div>
          </Link>
        </div>
      </ContextMenuTrigger>
      <TaskContextMenu task={task} projectId={task.project?.id} onStatusUpdate={onStatusUpdate} />
    </ContextMenu>
  )
}

// Workspace Task Grid component
const WorkspaceTaskGrid: FC<{
  task: UserTaskWithProject
  workspaceId: string
  onStatusUpdate: (
    taskId: string,
    projectId: string | undefined,
    newStatus: TaskStatus
  ) => Promise<void>
}> = ({ task, workspaceId, onStatusUpdate }) => {
  const handleLinkClick = (e: React.MouseEvent) => {
    // Check if the click target is an interactive element or its child
    const target = e.target as HTMLElement
    const interactiveSelectors = [
      '[data-priority-selector]',
      '[data-status-selector]',
      '[data-assignee-agent]',
      'button',
      '[role="button"]',
      '[role="combobox"]',
      '[role="menuitem"]',
    ]

    // Check if the clicked element or any of its parents match interactive selectors
    for (const selector of interactiveSelectors) {
      if (target.closest(selector)) {
        e.preventDefault()
        return
      }
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className='w-full'>
          <Link href={`/workspace/${workspaceId}/tasks/${task.id}`} onClick={handleLinkClick}>
            <motion.div className='h-full w-full cursor-default rounded-md border border-border/50 bg-card p-3 shadow-xs hover:shadow-none'>
              <div className='mb-2 flex items-center justify-between'>
                <div className='flex items-center gap-1.5'>
                  <div data-priority-selector>
                    <PrioritySelector
                      priority={task.priority}
                      taskId={task.id}
                      projectId={task.project?.id}
                      status={task.status}
                    />
                  </div>
                  <span className='font-medium text-muted-foreground text-xs'>
                    #{task.id.slice(-6)}
                  </span>
                </div>
                <div className='flex items-center gap-1.5'>
                  <div data-assignee-agent>
                    <AssignWorker
                      taskId={task.id}
                      workspaceId={workspaceId}
                      projectId={task.project?.id}
                      assigneeId={task.assigneeId}
                    />
                  </div>
                  <div data-status-selector>
                    <StatusLabel status={task.status} />
                  </div>
                </div>
              </div>

              <h3 className='mb-3 line-clamp-2 font-semibold text-sm'>{task.title}</h3>

              {/* Project Badge */}
              <div className='mb-2'>
                {task.project && (
                  <ProjectBadge
                    project={{
                      id: task.project.id,
                      name: task.project.name,
                      workspaceId: task.project.workspaceId,
                      workspaceName: task.project.workspaceName,
                    }}
                  />
                )}
              </div>

              {task.tags && task.tags.length > 0 && (
                <div className='mb-3 flex flex-wrap gap-1'>
                  {task.tags.map((tag, index) => (
                    <Badge key={index} variant='outline' className='px-2 py-0 text-xs'>
                      {tag.text}
                    </Badge>
                  ))}
                </div>
              )}

              <div className='mt-auto flex items-center justify-between pt-2'>
                <span className='text-muted-foreground text-xs'>
                  {format(new Date(task.createdAt), 'MMM dd')}
                </span>
              </div>
            </motion.div>
          </Link>
        </div>
      </ContextMenuTrigger>
      <TaskContextMenu task={task} projectId={task.project?.id} onStatusUpdate={onStatusUpdate} />
    </ContextMenu>
  )
}

// Workspace Task Group component
const WorkspaceTaskGroupTasks: FC<{
  status: TaskStatus
  tasks: UserTaskWithProject[]
  count: number
  workspaceId: string
  onTaskStatusUpdate: (
    taskId: string,
    projectId: string | undefined,
    newStatus: TaskStatus
  ) => Promise<void>
}> = ({ status, tasks, count, workspaceId, onTaskStatusUpdate }) => {
  const { viewType } = useViewStore()
  const isViewTypeGrid = viewType === 'grid'

  // Sort tasks by priority (Urgent -> High -> Medium -> Low)
  const sortedTasks = useMemo(() => {
    const priorityOrderMap = {
      [Priority.URGENT]: 0,
      [Priority.HIGH]: 1,
      [Priority.MEDIUM]: 2,
      [Priority.LOW]: 3,
    }
    return [...tasks].sort((a, b) => priorityOrderMap[a.priority] - priorityOrderMap[b.priority])
  }, [tasks])

  const config = statusConfig[status]
  const StatusIcon = config.icon

  return (
    <div
      className={cn(
        'rounded-md border border-border/50 bg-card',
        isViewTypeGrid
          ? 'flex h-full w-[348px] flex-shrink-0 flex-col overflow-hidden rounded-md'
          : ''
      )}
    >
      <div
        className={cn(
          'sticky top-0 z-10 w-full bg-container',
          isViewTypeGrid ? 'h-[50px] rounded-t-md' : 'h-10'
        )}
      >
        <div
          className={cn(
            'flex h-full w-full items-center justify-between backdrop-blur-md',
            isViewTypeGrid ? 'px-3' : 'px-6'
          )}
          style={{
            backgroundColor: isViewTypeGrid ? `${config.color}30` : `${config.color}20`,
          }}
        >
          <div className='flex items-center gap-2'>
            <StatusIcon />
            <span className='font-medium text-sm'>{config.name}</span>
            <span className='text-muted-foreground text-sm'>{count}</span>
          </div>
        </div>
      </div>

      {viewType === 'list' ? (
        <div className='space-y-0'>
          {sortedTasks.map((task) => (
            <WorkspaceTaskLine
              key={task.id}
              task={task}
              workspaceId={workspaceId}
              onStatusUpdate={onTaskStatusUpdate}
            />
          ))}
        </div>
      ) : (
        <WorkspaceTaskGridList
          tasks={sortedTasks}
          status={status}
          workspaceId={workspaceId}
          onTaskStatusUpdate={onTaskStatusUpdate}
        />
      )}
    </div>
  )
}

const WorkspaceTaskGridList: FC<{
  tasks: UserTaskWithProject[]
  status: TaskStatus
  workspaceId: string
  onTaskStatusUpdate: (
    taskId: string,
    projectId: string | undefined,
    newStatus: TaskStatus
  ) => Promise<void>
}> = ({ tasks, status, workspaceId, onTaskStatusUpdate }) => {
  const _config = statusConfig[status]

  return (
    <div className='relative h-full flex-1 space-y-2 overflow-y-auto bg-background p-2'>
      {tasks.map((task) => (
        <WorkspaceTaskGrid
          key={task.id}
          task={task}
          workspaceId={workspaceId}
          onStatusUpdate={onTaskStatusUpdate}
        />
      ))}
    </div>
  )
}
