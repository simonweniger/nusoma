'use client'

import NiceModal, { type NiceModalHocProps } from '@ebay/nice-modal-react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@nusoma/design-system/components/ui/alert-dialog'
import { Button } from '@nusoma/design-system/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@nusoma/design-system/components/ui/drawer'
import { FormProvider } from '@nusoma/design-system/components/ui/form'
import { toast } from '@nusoma/design-system/components/ui/sonner'
import type { TaskDto } from '@nusoma/types/dtos/task-dto'
import { Loader2 } from 'lucide-react'
import type { SubmitHandler } from 'react-hook-form'
import { MediaQueries } from '@/lib/media-queries'
import { useEnhancedModal } from '@/hooks/use-enhanced-modal'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useDeleteTask } from '@/hooks/use-tasks-api'
import { useZodForm } from '@/hooks/use-zod-form'
import { type DeleteTaskSchema, deleteTaskSchema } from '@/schemas/tasks/delete-task-schema'

export type DeleteTaskModalProps = NiceModalHocProps & {
  task: TaskDto
}

export const DeleteTaskModal = NiceModal.create<DeleteTaskModalProps>(({ task }) => {
  const modal = useEnhancedModal()
  const mdUp = useMediaQuery(MediaQueries.MdUp, { ssr: false })
  const deleteTaskMutation = useDeleteTask()
  const methods = useZodForm({
    schema: deleteTaskSchema,
    mode: 'all',
    defaultValues: {
      id: task.id,
    },
  })
  const title = 'Delete this task?'
  const canSubmit =
    !methods.formState.isSubmitting && methods.formState.isValid && !deleteTaskMutation.isPending
  const onSubmit: SubmitHandler<DeleteTaskSchema> = async (values) => {
    if (!canSubmit) {
      return
    }
    deleteTaskMutation.mutate(values.id, {
      onSuccess: () => {
        toast.success('Task deleted')
        modal.resolve(true)
        modal.handleClose()
      },
      onError: () => {
        toast.error("Task couldn't be deleted")
      },
    })
  }
  const renderDescription = (
    <>
      The task <strong className='font-medium text-foreground'>{task.title}</strong> will be
      permanently deleted, are you sure you want to continue?
    </>
  )
  const renderForm = (
    <form className='hidden' onSubmit={methods.handleSubmit(onSubmit)}>
      <input type='hidden' className='hidden' {...methods.register('id')} />
    </form>
  )
  const renderButtons = (
    <>
      <Button type='button' variant='outline' onClick={modal.handleClose}>
        Cancel
      </Button>
      <Button
        type='button'
        variant='destructive'
        disabled={!canSubmit || methods.formState.isSubmitting}
        onClick={methods.handleSubmit(onSubmit)}
      >
        {methods.formState.isSubmitting && (
          <>
            <Loader2 className='size-4 animate-spin' />
            Deleting...
          </>
        )}
        {!methods.formState.isSubmitting && 'Yes, delete'}
      </Button>
    </>
  )
  return (
    <FormProvider {...methods}>
      {mdUp ? (
        <AlertDialog open={modal.visible}>
          <AlertDialogContent
            className='max-w-sm'
            onClose={modal.handleClose}
            onAnimationEndCapture={modal.handleAnimationEndCapture}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription>{renderDescription}</AlertDialogDescription>
            </AlertDialogHeader>
            {renderForm}
            <AlertDialogFooter>{renderButtons}</AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <Drawer open={modal.visible} onOpenChange={modal.handleOpenChange}>
          <DrawerContent>
            <DrawerHeader className='text-left'>
              <DrawerTitle>{title}</DrawerTitle>
              <DrawerDescription>{renderDescription}</DrawerDescription>
            </DrawerHeader>
            {renderForm}
            <DrawerFooter className='flex-col-reverse pt-4'>{renderButtons}</DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </FormProvider>
  )
})
