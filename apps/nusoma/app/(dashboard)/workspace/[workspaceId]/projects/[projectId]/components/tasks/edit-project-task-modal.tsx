'use client'

import NiceModal, { type NiceModalHocProps } from '@ebay/nice-modal-react'
import { TaskStatus } from '@nusoma/database/schema'
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
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormProvider,
} from '@nusoma/design-system/components/ui/form'
import { Input } from '@nusoma/design-system/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@nusoma/design-system/components/ui/select'
import { Spinner } from '@nusoma/design-system/components/ui/spinner'
import { Textarea } from '@nusoma/design-system/components/ui/textarea'
import { cn } from '@nusoma/design-system/lib/utils'
import type { TaskDto } from '@nusoma/types/dtos/task-dto'
import type { SubmitHandler } from 'react-hook-form'
import { MediaQueries } from '@/lib/media-queries'
import { useEnhancedModal } from '@/hooks/use-enhanced-modal'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useUpdateTask } from '@/hooks/use-tasks-api'
import { useZodForm } from '@/hooks/use-zod-form'
import {
  type UpdateProjectTaskSchema,
  updateProjectTaskSchema,
} from '@/schemas/projects/update-project-task-schema'

export type EditProjectTaskModalProps = NiceModalHocProps & {
  task: TaskDto
}

export const EditProjectTaskModal = NiceModal.create<EditProjectTaskModalProps>(({ task }) => {
  const modal = useEnhancedModal()
  const mdUp = useMediaQuery(MediaQueries.MdUp, { ssr: false })
  const updateTask = useUpdateTask()

  const methods = useZodForm({
    schema: updateProjectTaskSchema,
    mode: 'onSubmit',
    defaultValues: {
      id: task.id,
      title: task.title,
      scheduleDate: task.scheduleDate ?? undefined,
      status: task.status,
      description: task.description ?? '',
    },
  })
  const title = 'Edit task'
  const description = 'Edit the task by changing the form fields below.'
  const canSubmit =
    !updateTask.isPending && (!methods.formState.isSubmitted || methods.formState.isDirty)
  const onSubmit: SubmitHandler<UpdateProjectTaskSchema> = async (values) => {
    if (!canSubmit) {
      return
    }

    updateTask.mutate(
      {
        taskId: values.id,
        data: {
          title: values.title,
          description: values.description,
          status: values.status,
          scheduleDate: values.scheduleDate?.toISOString(),
        },
      },
      {
        onSuccess: () => {
          modal.handleClose()
        },
      }
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
                disabled={updateTask.isPending}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className='flex flex-row space-x-4'>
        <FormField
          control={methods.control}
          name='status'
          render={({ field }) => (
            <FormItem className='flex w-full flex-col'>
              <FormLabel>Status</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={updateTask.isPending}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TaskStatus.TODO}>
                      <div className='flex flex-row items-center gap-1.5'>
                        <div className='size-2 shrink-0 rounded-full bg-green-600' />
                        <span>Completed</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={methods.control}
          name='scheduleDate'
          render={({ field }) => (
            <FormItem className='flex w-full flex-col'>
              <FormLabel>Due date</FormLabel>
              <FormControl>
                <DatePicker
                  date={field.value}
                  onDateChange={field.onChange}
                  disabled={updateTask.isPending}
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
                disabled={updateTask.isPending}
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
        disabled={!canSubmit || updateTask.isPending}
        onClick={methods.handleSubmit(onSubmit)}
      >
        {updateTask.isPending ? (
          <>
            <Spinner className='mr-2 h-4 w-4' />
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
})
