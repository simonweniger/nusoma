'use client'

import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback } from '@nusoma/design-system/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@nusoma/design-system/components/ui/dropdown-menu'
import { CheckIcon, CircleUserRound, UserIcon, WorkflowIcon } from 'lucide-react'
import { useAssignWorker } from '@/hooks/use-tasks-api'
import { useWorkerRegistry } from '@/stores/workers/registry/store'

type WorkerForAssignee = {
  id: string
  name: string
  color: string
}

interface AssignWorkerProps {
  taskId: string
  workspaceId: string
  projectId: string | undefined
  assigneeId?: string | null
  onAssignmentChange?: (assigneeId: string | null) => void
  showWorkerName?: boolean
}

export function AssignWorker({
  taskId,
  workspaceId,
  projectId,
  assigneeId,
  showWorkerName = false,
}: AssignWorkerProps) {
  const [open, setOpen] = useState(false)
  const [currentAssigneeId, setCurrentAssigneeId] = useState<string | null>(assigneeId || null)
  const [previousAssigneeId, setPreviousAssigneeId] = useState<string | null>(assigneeId || null)

  const assignWorkerMutation = useAssignWorker()

  const assignWorker = (data: { taskId: string; projectId?: string; workerId: string | null }) => {
    assignWorkerMutation.mutate(
      { taskId: data.taskId, data: { workerId: data.workerId, projectId: data.projectId } },
      {
        onSuccess: () => {
          setOpen(false)
          setPreviousAssigneeId(currentAssigneeId)
        },
        onError: () => {
          setCurrentAssigneeId(previousAssigneeId)
          setOpen(false)
        },
      }
    )
  }

  const isAssigning = assignWorkerMutation.isPending

  useEffect(() => {
    setCurrentAssigneeId(assigneeId || null)
    setPreviousAssigneeId(assigneeId || null)
  }, [assigneeId])

  // Get workers from worker registry (treating workers as workers)
  const { workers, activeWorkspaceId, isLoading: isLoadingWorkers } = useWorkerRegistry()

  // Filter workers for the current workspace
  const workersForWorkspace = workers
    ? Object.values(workers).filter(
        (worker) => worker.workspaceId === workspaceId || worker.workspaceId === activeWorkspaceId
      )
    : []

  // Find the currently assigned worker
  const currentWorker = workersForWorkspace.find((worker) => worker.id === currentAssigneeId)

  const handleAssignment = (newWorkerId: string | null) => {
    setPreviousAssigneeId(currentAssigneeId)
    setCurrentAssigneeId(newWorkerId)
    assignWorker({
      taskId,
      projectId,
      workerId: newWorkerId,
    })
  }

  const renderAvatar = () => {
    if (currentWorker) {
      return (
        <Avatar className='size-5 shrink-0'>
          <AvatarFallback
            className='font-medium text-white text-xs'
            style={{ backgroundColor: currentWorker.color }}
          >
            <WorkflowIcon className='size-3' />
          </AvatarFallback>
        </Avatar>
      )
    }
    return (
      <div className='flex size-6 items-center justify-center'>
        <CircleUserRound className='size-5 text-zinc-600' />
      </div>
    )
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className='relative flex w-full cursor-pointer items-center gap-2 hover:bg-muted focus:outline-none '
          disabled={isAssigning || isLoadingWorkers}
        >
          {renderAvatar()}
          {showWorkerName && (
            <span className='font-medium text-sm'>
              {currentWorker ? currentWorker.name : 'No assignee'}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start' className='w-[206px]'>
        <DropdownMenuLabel>Assign to...</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation()
            handleAssignment(null)
          }}
          disabled={isAssigning}
        >
          <div className='flex items-center gap-2'>
            <UserIcon className='h-5 w-5' />
            <span>No assignee</span>
          </div>
          {!currentAssigneeId && <CheckIcon className='ml-auto h-4 w-4' />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Workers</DropdownMenuLabel>
        {isLoadingWorkers ? (
          <DropdownMenuItem disabled>
            <span>Loading workers...</span>
          </DropdownMenuItem>
        ) : workersForWorkspace.length === 0 ? (
          <DropdownMenuItem disabled>
            <span>No workers available</span>
          </DropdownMenuItem>
        ) : (
          workersForWorkspace.map((worker) => (
            <DropdownMenuItem
              key={worker.id}
              onClick={(e) => {
                e.stopPropagation()
                handleAssignment(worker.id)
              }}
              disabled={isAssigning}
            >
              <div className='flex items-center gap-2'>
                <Avatar className='size-5'>
                  <AvatarFallback
                    className='font-medium text-white text-xs'
                    style={{ backgroundColor: worker.color }}
                  >
                    <WorkflowIcon className='size-3' />
                  </AvatarFallback>
                </Avatar>
                <span>{worker.name}</span>
              </div>
              {currentAssigneeId === worker.id && <CheckIcon className='ml-auto h-4 w-4' />}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
