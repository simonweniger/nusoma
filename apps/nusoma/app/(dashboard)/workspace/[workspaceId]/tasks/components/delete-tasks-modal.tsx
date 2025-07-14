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
import { Spinner } from '@nusoma/design-system/components/ui/spinner'
import type { TaskDto } from '@nusoma/types/dtos/task-dto'
import type { SubmitHandler } from 'react-hook-form'
import { MediaQueries } from '@/lib/media-queries'
import { useEnhancedModal } from '@/hooks/use-enhanced-modal'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useDeleteTasks } from '@/hooks/use-tasks-api'
import { useZodForm } from '@/hooks/use-zod-form'
import { type DeleteTasksSchema, deleteTasksSchema } from '@/schemas/tasks/delete-tasks-schema'

export type DeleteTasksModalProps = NiceModalHocProps & {
  tasks: TaskDto[]
}

export const DeleteTasksModal = NiceModal.create<DeleteTasksModalProps>(({ tasks }) => {
  const modal = useEnhancedModal()
  const mdUp = useMediaQuery(MediaQueries.MdUp, { ssr: false })
  const deleteTasksMutation = useDeleteTasks()
  const methods = useZodForm({
    schema: deleteTasksSchema,
    mode: 'all',
    defaultValues: {
      ids: tasks.map((task) => task.id),
    },
  })
  const amount = tasks.length
  const subject = amount === 1 ? 'Task' : 'Tasks'
  const title = `Delete ${subject.toLowerCase()}?`
  const canSubmit =
    !methods.formState.isSubmitting && methods.formState.isValid && !deleteTasksMutation.isPending
  const onSubmit: SubmitHandler<DeleteTasksSchema> = async (values) => {
    if (!canSubmit) {
      return
    }
    deleteTasksMutation.mutate(values.ids, {
      onSuccess: () => {
        toast.success(`${subject} deleted`)
        modal.handleClose()
      },
      onError: () => {
        toast.error(`${subject} couldn't be deleted`)
      },
    })
  }
  const renderDescription = (
    <>
      You're about to delete{' '}
      <strong className='font-medium text-foreground'>{`${amount} ${subject.toLowerCase()}`}</strong>
      . This action cannot be undone.
    </>
  )
  const renderForm = (
    <form className='hidden' onSubmit={methods.handleSubmit(onSubmit)}>
      <input type='hidden' className='hidden' {...methods.register('ids')} />
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
        {methods.formState.isSubmitting ? (
          <>
            <Spinner className='mr-2 size-4 animate-spin' />
            <span>Deleting...</span>
          </>
        ) : (
          'Yes, delete'
        )}
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
