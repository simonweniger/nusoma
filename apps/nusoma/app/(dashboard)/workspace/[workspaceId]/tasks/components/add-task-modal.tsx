'use client'

import { useState } from 'react'
import NiceModal, { type NiceModalHocProps } from '@ebay/nice-modal-react'
import { Priority, TaskStatus } from '@nusoma/database/schema'
import { Avatar, AvatarFallback } from '@nusoma/design-system/components/ui/avatar'
import { Button } from '@nusoma/design-system/components/ui/button'
import { DatePicker } from '@nusoma/design-system/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@nusoma/design-system/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@nusoma/design-system/components/ui/drawer'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@nusoma/design-system/components/ui/dropdown-menu'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormProvider,
} from '@nusoma/design-system/components/ui/form'
import { Input } from '@nusoma/design-system/components/ui/input'
import { Spinner } from '@nusoma/design-system/components/ui/spinner'
import { Textarea } from '@nusoma/design-system/components/ui/textarea'
import { cn } from '@nusoma/design-system/lib/utils'
import { CheckIcon, CircleUserRound, UserIcon, Workflow } from 'lucide-react'
import type { SubmitHandler } from 'react-hook-form'
import { MediaQueries } from '@/lib/media-queries'
import { useEnhancedModal } from '@/hooks/use-enhanced-modal'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useCreateTask } from '@/hooks/use-tasks-api'
import { useZodForm } from '@/hooks/use-zod-form'
import { type AddTaskSchema, addTaskSchema } from '@/schemas/tasks/add-task-schema'
import { useWorkerRegistry } from '@/stores/workers/registry/store'

export type AddProjectTaskModalProps = NiceModalHocProps & {
  workspaceId?: string
  projectId?: string
  defaultStatus?: TaskStatus
}

export const AddTaskModal = NiceModal.create<AddProjectTaskModalProps>(
  ({ workspaceId, projectId }) => {
    const modal = useEnhancedModal()
    const mdUp = useMediaQuery(MediaQueries.MdUp, { ssr: false })
    const createTask = useCreateTask()
    const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null)

    // Get workers from worker registry
    const { workers, activeWorkspaceId, isLoading: isLoadingWorkers } = useWorkerRegistry()

    // Filter workers for the current workspace
    const workersForWorkspace = workers
      ? Object.values(workers).filter(
          (worker) => worker.workspaceId === workspaceId || worker.workspaceId === activeWorkspaceId
        )
      : []

    // Find the currently selected worker
    const selectedWorker = workersForWorkspace.find((worker) => worker.id === selectedWorkerId)

    const methods = useZodForm({
      schema: addTaskSchema,
      mode: 'onSubmit',
      defaultValues: {
        title: '',
        workspaceId: workspaceId || '',
        projectId: projectId || undefined,
        scheduleDate: undefined,
        status: TaskStatus.TODO, // Always TODO for new tasks
        description: '',
        priority: Priority.MEDIUM,
        assigneeId: undefined,
        tags: [],
      },
    })

    const title = 'Add task'
    const description = 'Create a new task by filling out the form below.'
    const canSubmit =
      !createTask.isPending && (!methods.formState.isSubmitted || methods.formState.isDirty)

    const onSubmit: SubmitHandler<AddTaskSchema> = async (values) => {
      if (!canSubmit) {
        return
      }

      createTask.mutate(
        {
          title: values.title,
          description: values.description,
          status: TaskStatus.TODO, // Always TODO
          scheduleDate: values.scheduleDate?.toISOString(),
          priority: values.priority,
          workspaceId: values.workspaceId,
          projectId: values.projectId,
          assigneeId: selectedWorkerId || undefined, // Use selected worker
          tags: values.tags || [],
        },
        {
          onSuccess: () => {
            modal.handleClose()
          },
        }
      )
    }

    const renderWorkerAvatar = () => {
      if (selectedWorker) {
        return (
          <Avatar className='size-5 shrink-0'>
            <AvatarFallback
              className='font-medium text-white text-xs'
              style={{ backgroundColor: selectedWorker.color }}
            >
              <Workflow className='size-3' />
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

    const renderForm = (
      <form className={cn('space-y-4', !mdUp && 'p-4')} onSubmit={methods.handleSubmit(onSubmit)}>
        <FormField
          control={methods.control}
          name='title'
          render={({ field }) => (
            <FormItem className='flex w-full flex-col'>
              <FormLabel required>Title</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type='text'
                  maxLength={64}
                  required
                  disabled={createTask.isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className='flex flex-row space-x-4'>
          <FormItem className='flex w-full flex-col'>
            <FormLabel>Assign to Worker</FormLabel>
            <FormDescription>Choose a worker to handle this task.</FormDescription>
            <FormControl>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='outline'
                    className='justify-start'
                    disabled={createTask.isPending || isLoadingWorkers}
                  >
                    <div className='flex items-center gap-2'>
                      {renderWorkerAvatar()}
                      <span>{selectedWorker ? selectedWorker.name : 'No assignee'}</span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='start' className='w-[206px]'>
                  <DropdownMenuLabel>Assign to...</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => setSelectedWorkerId(null)}
                    disabled={createTask.isPending}
                  >
                    <div className='flex items-center gap-2'>
                      <UserIcon className='h-5 w-5' />
                      <span>No assignee</span>
                    </div>
                    {!selectedWorkerId && <CheckIcon className='ml-auto h-4 w-4' />}
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
                        onClick={() => setSelectedWorkerId(worker.id)}
                        disabled={createTask.isPending}
                      >
                        <div className='flex items-center gap-2'>
                          <Avatar className='size-5'>
                            <AvatarFallback
                              className='font-medium text-white text-xs'
                              style={{ backgroundColor: worker.color }}
                            >
                              <Workflow className='size-3' />
                            </AvatarFallback>
                          </Avatar>
                          <span>{worker.name}</span>
                        </div>
                        {selectedWorkerId === worker.id && (
                          <CheckIcon className='ml-auto h-4 w-4' />
                        )}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </FormControl>
          </FormItem>
          <FormField
            control={methods.control}
            name='scheduleDate'
            render={({ field }) => (
              <FormItem className='flex w-full flex-col'>
                <FormLabel>Schedule date</FormLabel>
                <FormDescription>When should the task be worked on?</FormDescription>
                <FormControl>
                  <DatePicker
                    date={field.value}
                    onDateChange={field.onChange}
                    disabled={createTask.isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={methods.control}
          name='description'
          render={({ field }) => (
            <FormItem className='flex w-full flex-col'>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  maxLength={8000}
                  required
                  rows={4}
                  disabled={createTask.isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    )
    const renderButtons = (
      <>
        <Button type='button' variant='outline' onClick={modal.handleClose}>
          Cancel
        </Button>
        <Button
          type='button'
          variant='default'
          disabled={!canSubmit || createTask.isPending}
          onClick={methods.handleSubmit(onSubmit)}
        >
          {createTask.isPending ? (
            <>
              <Spinner className='mr-2 size-4' />
              Saving...
            </>
          ) : (
            'Save'
          )}
        </Button>
      </>
    )
    return (
      <FormProvider {...methods}>
        {mdUp ? (
          <Dialog open={modal.visible}>
            <DialogContent
              className='max-w-md'
              onClose={modal.handleClose}
              onAnimationEndCapture={modal.handleAnimationEndCapture}
            >
              <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription className='sr-only'>{description}</DialogDescription>
              </DialogHeader>
              {renderForm}
              <DialogFooter>{renderButtons}</DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          <Drawer open={modal.visible} onOpenChange={modal.handleOpenChange}>
            <DrawerContent>
              <DrawerHeader className='text-left'>
                <DrawerTitle>{title}</DrawerTitle>
                <DrawerDescription className='sr-only'>{description}</DrawerDescription>
              </DrawerHeader>
              {renderForm}
              <DrawerFooter className='flex-col-reverse pt-4'>{renderButtons}</DrawerFooter>
            </DrawerContent>
          </Drawer>
        )}
      </FormProvider>
    )
  }
)
