import { useState } from 'react'
import NiceModal from '@ebay/nice-modal-react'
import type { Priority, TaskStatus } from '@nusoma/database/schema'
import { Avatar, AvatarFallback } from '@nusoma/design-system/components/ui/avatar'
import {
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@nusoma/design-system/components/ui/context-menu'
import type { TaskDto } from '@nusoma/types/dtos/task-dto'
import type { UserTaskWithProject } from '@nusoma/types/dtos/user-task-dto'
import {
  AlarmClock,
  ArrowRightLeft,
  BarChart3,
  Bell,
  Bot,
  CalendarClock,
  CheckCircle2,
  CircleCheck,
  Clipboard,
  Clock,
  Copy as CopyIcon,
  FileText,
  Flag,
  Link as LinkIcon,
  MessageSquare,
  Pencil,
  PlusSquare,
  Repeat2,
  Star,
  Trash2,
  User,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { getAllPriorities, priorityConfig } from '@/lib/task-priority'
import { getAllStatuses, statusConfig } from '@/lib/task-status'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { useUpdateTaskProperties, useUpdateTaskStatus } from '@/hooks/use-tasks-api'
import { useWorkerRegistry } from '@/stores/workers/registry/store'
import type { WorkerMetadata } from '@/stores/workers/registry/types'
import { DeleteTaskModal } from './delete-task-modal'

interface TaskContextMenuProps {
  task: TaskDto | UserTaskWithProject
  projectId: string | undefined
  onStatusUpdate: (
    taskId: string,
    projectId: string | undefined,
    newStatus: TaskStatus
  ) => Promise<void>
  onPriorityUpdate?: (
    taskId: string,
    projectId: string | undefined,
    newPriority: Priority
  ) => Promise<void>
}

export function TaskContextMenu({
  task,
  projectId,
  onStatusUpdate,
  onPriorityUpdate,
}: TaskContextMenuProps) {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const copyToClipboard = useCopyToClipboard()
  const _router = useRouter()
  const updateTaskPropertiesMutation = useUpdateTaskProperties()
  const updateTaskStatusMutation = useUpdateTaskStatus()

  // Get workers from worker registry
  const { workers, isLoading: isLoadingWorkers } = useWorkerRegistry()
  const workersList: WorkerMetadata[] = workers ? Object.values(workers) : []

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task) {
      return
    }
    if (onStatusUpdate) {
      await onStatusUpdate(task.id, projectId, newStatus)
    } else {
      updateTaskStatusMutation.mutate(
        { taskId: task.id, status: newStatus },
        {
          onSuccess: () => {
            const config = statusConfig[newStatus]
            // Success toast is handled by the hook, but we can show specific message
            toast.success(`Status updated to ${config.name}`)
          },
          onError: () => {
            toast.error('Failed to update status')
          },
        }
      )
    }
  }

  const handlePriorityChange = async (newPriority: Priority) => {
    if (!task) {
      return
    }
    if (onPriorityUpdate) {
      await onPriorityUpdate(task.id, projectId, newPriority)
    } else {
      updateTaskPropertiesMutation.mutate(
        { taskId: task.id, properties: { priority: newPriority, status: task.status } },
        {
          onSuccess: () => {
            const config = priorityConfig[newPriority]
            // Success toast is handled by the hook, but we can show specific message
            toast.success(`Priority updated to ${config.name}`)
          },
          onError: () => {
            toast.error('Failed to update priority')
          },
        }
      )
    }
  }

  const handleAssigneeChange = (workerId: string | null) => {
    if (!task) {
      return
    }
    // TODO: Implement worker assignment logic
    const worker = workersList.find((w: WorkerMetadata) => w.id === workerId)
    toast.success(worker ? `Assigned to ${worker.name}` : 'Unassigned')
  }

  const handleSetScheduleDate = () => {
    if (!task) {
      return
    }
    // TODO: Implement schedule date update
    toast.success('Schedule date set to 7 days from now')
  }

  const handleAddLink = () => {
    toast.success('Link added')
  }

  const handleMakeCopy = () => {
    toast.success('Task copied')
  }

  const handleCreateRelated = () => {
    toast.success('Related task created')
  }

  const handleMarkAs = (type: string) => {
    toast.success(`Marked as ${type}`)
  }

  const handleMove = () => {
    toast.success('Task moved')
  }

  const handleSubscribe = () => {
    setIsSubscribed(!isSubscribed)
    toast.success(isSubscribed ? 'Unsubscribed from task' : 'Subscribed to task')
  }

  const handleFavorite = () => {
    setIsFavorite(!isFavorite)
    toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites')
  }

  const handleCopy = () => {
    if (!task) {
      return
    }
    //navigator.clipboard.writeText(task.title)
    copyToClipboard(task.id)

    toast.success('Copied to clipboard')
  }

  const handleRemindMe = () => {
    toast.success('Reminder set')
  }

  const handleDelete = () => {
    if (!task) {
      return
    }
    NiceModal.show(DeleteTaskModal, {
      task,
    })
    toast.success('Task deleted')
  }

  const allStatuses = getAllStatuses()
  const allPriorities = getAllPriorities()

  return (
    <ContextMenuContent className='w-64'>
      <ContextMenuGroup>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <CircleCheck className='mr-2 size-4' /> Status
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className='w-48'>
            {allStatuses.map((status) => {
              const config = statusConfig[status]
              const StatusIcon = config.icon
              return (
                <ContextMenuItem
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={task.status === status ? 'bg-accent' : ''}
                >
                  <StatusIcon /> {config.name}
                </ContextMenuItem>
              )
            })}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <User className='mr-2 size-4' /> Assignee
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className='w-48'>
            <ContextMenuItem onClick={() => handleAssigneeChange(null)}>
              <User className='mr-2 size-4' /> Unassigned
            </ContextMenuItem>
            {isLoadingWorkers ? (
              <ContextMenuItem disabled>Loading workers...</ContextMenuItem>
            ) : (
              workersList.map((worker) => (
                <ContextMenuItem key={worker.id} onClick={() => handleAssigneeChange(worker.id)}>
                  <div className='flex items-center gap-2'>
                    <Avatar className='size-4'>
                      <AvatarFallback className='text-xs' style={{ backgroundColor: worker.color }}>
                        <Bot className='size-3' />
                      </AvatarFallback>
                    </Avatar>
                    {worker.name}
                  </div>
                </ContextMenuItem>
              ))
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <BarChart3 className='mr-2 size-4' /> Priority
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className='w-48'>
            {allPriorities.map((priority) => {
              const config = priorityConfig[priority]
              const PriorityIcon = config.icon
              return (
                <ContextMenuItem
                  key={priority}
                  onClick={() => handlePriorityChange(priority)}
                  className={task.priority === priority ? 'bg-accent' : ''}
                >
                  <PriorityIcon />
                  {config.name}
                </ContextMenuItem>
              )
            })}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuItem onClick={handleSetScheduleDate}>
          <CalendarClock className='mr-2 size-4' /> Set schedule date...
          <ContextMenuShortcut>D</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuItem>
          <Pencil className='mr-2 size-4' /> Rename...
          <ContextMenuShortcut>R</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={handleAddLink}>
          <LinkIcon className='mr-2 size-4' /> Add link...
          <ContextMenuShortcut>Ctrl L</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Repeat2 className='mr-2 size-4' /> Convert into
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className='w-48'>
            <ContextMenuItem>
              <FileText className='mr-2 size-4' /> Document
            </ContextMenuItem>
            <ContextMenuItem>
              <MessageSquare className='mr-2 size-4' /> Comment
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuItem onClick={handleMakeCopy}>
          <CopyIcon className='mr-2 size-4' /> Make a copy...
        </ContextMenuItem>
      </ContextMenuGroup>

      <ContextMenuSeparator />

      <ContextMenuItem onClick={handleCreateRelated}>
        <PlusSquare className='mr-2 size-4' /> Create related
      </ContextMenuItem>

      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <Flag className='mr-2 size-4' /> Mark as
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className='w-48'>
          <ContextMenuItem onClick={() => handleMarkAs('Completed')}>
            <CheckCircle2 className='mr-2 size-4' /> Completed
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleMarkAs('Duplicate')}>
            <CopyIcon className='mr-2 size-4' /> Duplicate
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleMarkAs("Won't Fix")}>
            <Clock className='mr-2 size-4' /> Won&apos;t Fix
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>

      <ContextMenuItem onClick={handleMove}>
        <ArrowRightLeft className='mr-2 size-4' /> Move
      </ContextMenuItem>

      <ContextMenuSeparator />

      <ContextMenuItem onClick={handleSubscribe}>
        <Bell className='mr-2 size-4' /> {isSubscribed ? 'Unsubscribe' : 'Subscribe'}
        <ContextMenuShortcut>S</ContextMenuShortcut>
      </ContextMenuItem>

      <ContextMenuItem onClick={handleFavorite}>
        <Star className='mr-2 size-4' /> {isFavorite ? 'Unfavorite' : 'Favorite'}
        <ContextMenuShortcut>F</ContextMenuShortcut>
      </ContextMenuItem>

      <ContextMenuItem onClick={handleCopy}>
        <Clipboard className='mr-2 size-4' /> Copy
      </ContextMenuItem>

      <ContextMenuItem onClick={handleRemindMe}>
        <AlarmClock className='mr-2 size-4' /> Remind me
        <ContextMenuShortcut>H</ContextMenuShortcut>
      </ContextMenuItem>

      <ContextMenuSeparator />

      <ContextMenuItem variant='destructive' onClick={handleDelete}>
        <Trash2 className='mr-2 size-4' /> Delete...
        <ContextMenuShortcut>⌘⌫</ContextMenuShortcut>
      </ContextMenuItem>
    </ContextMenuContent>
  )
}
