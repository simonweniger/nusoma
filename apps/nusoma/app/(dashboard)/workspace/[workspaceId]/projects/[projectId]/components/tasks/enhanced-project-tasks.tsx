'use client'

import { type FC, useMemo, useRef } from 'react'
import NiceModal from '@ebay/nice-modal-react'
import { Priority, TaskStatus } from '@nusoma/database/schema'
import { Badge } from '@nusoma/design-system/components/ui/badge'
import { Button } from '@nusoma/design-system/components/ui/button'
import { ContextMenu, ContextMenuTrigger } from '@nusoma/design-system/components/ui/context-menu'
import { toast } from '@nusoma/design-system/components/ui/sonner'
import { cn } from '@nusoma/design-system/lib/utils'
import type { ProjectDto } from '@nusoma/types/dtos/project-dto'
import type { TaskDto } from '@nusoma/types/dtos/task-dto'
import { format } from 'date-fns'
import { CheckSquare2Icon, Plus } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { getAllStatuses, statusConfig } from '@/lib/task-status'
import { useUpdateTaskStatus } from '@/hooks/use-tasks-api'
import { useViewStore } from '@/stores/view-store'
import { AddTaskModal } from '../../../../tasks/components/add-task-modal'
import { PrioritySelector } from '../../../../tasks/components/priority-selector'
import { StatusLabel } from '../../../../tasks/components/status-label'
import { TaskContextMenu } from '../../../../tasks/components/tasks-context-menu'

export type EnhancedProjectTasksProps = {
  project: ProjectDto
  initialTasks: TaskDto[]
}

export const ProjectTaskDragType = 'PROJECT_TASK'

// Enhanced Project Task Line component
const EnhancedProjectTaskLine: FC<{
  task: TaskDto
  projectId: string
  onStatusUpdate: (taskId: string, newStatus: TaskStatus) => Promise<void>
}> = ({ task, projectId, onStatusUpdate }) => {
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ProjectTaskDragType,
    item: { ...task, projectId },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }))

  drag(ref)

  const handleTaskClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement
    if (
      target.closest('button') ||
      target.closest('[role="combobox"]') ||
      target.closest('[data-selector]')
    ) {
      return
    }

    router.push(`/tasks/${task.id}`)
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <motion.div
          ref={ref}
          className='flex h-11 w-full cursor-pointer items-center justify-start px-6 hover:bg-sidebar/50'
          style={{ opacity: isDragging ? 0.5 : 1 }}
          onClick={handleTaskClick}
        >
          <div className='flex items-center gap-2'>
            <div data-selector='priority'>
              <PrioritySelector
                priority={task.priority}
                taskId={task.id}
                projectId={projectId}
                status={task.status}
              />
            </div>

            <span className='mr-2 hidden w-[66px] shrink-0 truncate font-medium text-muted-foreground text-sm sm:inline-block'>
              #{task.id.slice(-6)}
            </span>

            <div data-selector='status'>
              <StatusLabel status={task.status} />
            </div>
          </div>

          <span className='mr-1 ml-2 flex min-w-0 items-center justify-start'>
            <span className='truncate font-medium text-xs sm:font-semibold sm:text-sm'>
              {task.title}
            </span>
          </span>

          <div className='ml-auto flex items-center justify-end gap-2'>
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
      </ContextMenuTrigger>
      <TaskContextMenu
        task={task}
        projectId={projectId}
        onStatusUpdate={(taskId, _projectId, newStatus) => onStatusUpdate(taskId, newStatus)}
      />
    </ContextMenu>
  )
}

// Enhanced Project Task Grid component
const EnhancedProjectTaskGrid: FC<{
  task: TaskDto
  projectId: string
  onStatusUpdate: (taskId: string, newStatus: TaskStatus) => Promise<void>
}> = ({ task, projectId, onStatusUpdate }) => {
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ProjectTaskDragType,
    item: { ...task, projectId },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }))

  drag(ref)

  const handleTaskClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement
    if (
      target.closest('button') ||
      target.closest('[role="combobox"]') ||
      target.closest('[data-selector]')
    ) {
      return
    }

    router.push(`/tasks/${task.id}`)
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <motion.div
          ref={ref}
          className='w-full cursor-pointer rounded-md border border-border/50 bg-card p-3 shadow-xs hover:shadow-none'
          style={{ opacity: isDragging ? 0.5 : 1 }}
          onClick={handleTaskClick}
        >
          <div className='mb-2 flex items-center justify-between'>
            <div className='flex items-center gap-1.5'>
              <div data-selector='priority'>
                <PrioritySelector
                  priority={task.priority}
                  taskId={task.id}
                  projectId={projectId}
                  status={task.status}
                />
              </div>
              <span className='font-medium text-muted-foreground text-xs'>
                #{task.id.slice(-6)}
              </span>
            </div>
            <div data-selector='status'>
              <StatusLabel status={task.status} />
            </div>
          </div>

          <h3 className='mb-3 line-clamp-2 font-semibold text-sm'>{task.title}</h3>

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
      </ContextMenuTrigger>
      <TaskContextMenu
        task={task}
        projectId={projectId}
        onStatusUpdate={(taskId, _projectId, newStatus) => onStatusUpdate(taskId, newStatus)}
      />
    </ContextMenu>
  )
}

export function EnhancedProjectTasks({
  project,
  initialTasks,
}: EnhancedProjectTasksProps): React.JSX.Element {
  const { viewType } = useViewStore()
  const isViewTypeGrid = viewType === 'grid'
  const updateTaskStatusMutation = useUpdateTaskStatus()

  const handleShowAddTaskModal = (): void => {
    NiceModal.show(AddTaskModal, {
      projectId: project.id,
    })
  }

  // Group tasks by status using database enums
  const tasksByStatus = useMemo(() => {
    const tasksByStatus: Record<TaskStatus, TaskDto[]> = {
      [TaskStatus.TODO]: [],
      [TaskStatus.IN_PROGRESS]: [],
      [TaskStatus.WORK_COMPLETE]: [],
      [TaskStatus.HUMAN_NEEDED]: [],
      [TaskStatus.REVIEWED]: [],
      [TaskStatus.ERROR]: [],
    }

    initialTasks.forEach((task: TaskDto) => {
      tasksByStatus[task.status].push(task)
    })

    return tasksByStatus
  }, [initialTasks])

  // Task status update with TanStack Query
  const handleTaskStatusUpdate = async (taskId: string, newStatus: TaskStatus) => {
    updateTaskStatusMutation.mutate(
      { taskId, status: newStatus },
      {
        onSuccess: () => {
          toast.success('Task status updated')
        },
        onError: () => {
          toast.error("Couldn't update task status")
        },
      }
    )
  }

  // All statuses to display
  const allStatuses = getAllStatuses()

  return (
    <div className='h-full w-full'>
      {/* Header */}
      <div className='flex h-14 flex-row items-center justify-between gap-2 border-b px-6'>
        <h1 className='font-semibold text-sm'>
          All tasks <span className='text-muted-foreground'>({initialTasks.length})</span>
        </h1>
        <div className='flex items-center gap-2'>
          <Button type='button' variant='outline' size='default' onClick={handleShowAddTaskModal}>
            <CheckSquare2Icon className='mr-2 size-4 shrink-0' />
            Add task
          </Button>
        </div>
      </div>

      {/* Tasks Content */}
      <div className='h-[calc(100%-3.5rem)]'>
        <div className={cn('h-full w-full', isViewTypeGrid && 'overflow-x-auto')}>
          <DndProvider backend={HTML5Backend}>
            <div className={cn(isViewTypeGrid && 'flex h-full min-w-max gap-3 px-2 py-2')}>
              {allStatuses.map((status) => (
                <EnhancedProjectGroupTasks
                  key={status}
                  status={status}
                  tasks={tasksByStatus[status] || []}
                  count={tasksByStatus[status]?.length || 0}
                  project={project}
                  onTaskStatusUpdate={handleTaskStatusUpdate}
                />
              ))}
            </div>
          </DndProvider>
        </div>
      </div>
    </div>
  )
}

// Enhanced Group Tasks component
const EnhancedProjectGroupTasks: FC<{
  status: TaskStatus
  tasks: TaskDto[]
  count: number
  project: ProjectDto
  onTaskStatusUpdate: (taskId: string, newStatus: TaskStatus) => Promise<void>
}> = ({ status, tasks, count, project, onTaskStatusUpdate }) => {
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

  const handleShowAddTaskModal = (): void => {
    NiceModal.show(AddTaskModal, {
      projectId: project.id,
      defaultStatus: status,
    })
  }

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

          <Button
            className='size-6'
            size='icon'
            variant='ghost'
            onClick={(e) => {
              e.stopPropagation()
              handleShowAddTaskModal()
            }}
          >
            <Plus className='size-4' />
          </Button>
        </div>
      </div>

      {viewType === 'list' ? (
        <div className='space-y-0'>
          {sortedTasks.map((task) => (
            <EnhancedProjectTaskLine
              key={task.id}
              task={task}
              projectId={project.id}
              onStatusUpdate={onTaskStatusUpdate}
            />
          ))}
        </div>
      ) : (
        <EnhancedProjectTaskGridList
          tasks={sortedTasks}
          status={status}
          projectId={project.id}
          onTaskStatusUpdate={onTaskStatusUpdate}
        />
      )}
    </div>
  )
}

const EnhancedProjectTaskGridList: FC<{
  tasks: TaskDto[]
  status: TaskStatus
  projectId: string
  onTaskStatusUpdate: (taskId: string, newStatus: TaskStatus) => Promise<void>
}> = ({ tasks, status, projectId, onTaskStatusUpdate }) => {
  const ref = useRef<HTMLDivElement>(null)

  // Set up drop functionality to accept only project task items
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ProjectTaskDragType,
    drop(item: TaskDto & { projectId: string }, monitor) {
      if (monitor.didDrop() && item.status !== status) {
        onTaskStatusUpdate(item.id, status)
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }))
  drop(ref)

  const config = statusConfig[status]

  return (
    <div ref={ref} className='relative h-full flex-1 space-y-2 overflow-y-auto bg-background p-2'>
      <AnimatePresence>
        {isOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className='pointer-events-none fixed top-0 right-0 bottom-0 left-0 z-10 flex items-center justify-center bg-background/90'
            style={{
              width: ref.current?.getBoundingClientRect().width || '100%',
              height: ref.current?.getBoundingClientRect().height || '100%',
              transform: `translate(${ref.current?.getBoundingClientRect().left || 0}px, ${ref.current?.getBoundingClientRect().top || 0}px)`,
            }}
          >
            <div className='max-w-[90%] rounded-md border border-border bg-background p-3 shadow-md'>
              <p className='text-center font-medium text-sm'>Drop to move to {config.name}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {tasks.map((task) => (
        <EnhancedProjectTaskGrid
          key={task.id}
          task={task}
          projectId={projectId}
          onStatusUpdate={onTaskStatusUpdate}
        />
      ))}
    </div>
  )
}
