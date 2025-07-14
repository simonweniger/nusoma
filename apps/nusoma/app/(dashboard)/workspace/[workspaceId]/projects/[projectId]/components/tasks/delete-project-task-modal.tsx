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
import { deleteProjectTask } from '@/actions/projects/delete-project-task'
import { useEnhancedModal } from '@/hooks/use-enhanced-modal'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useZodForm } from '@/hooks/use-zod-form'
import {
  type DeleteProjectSchema,
  deleteProjectSchema,
} from '@/schemas/projects/delete-project-schema'

export type DeleteProjectTaskModalProps = NiceModalHocProps & {
  task: TaskDto
}

export const DeleteProjectTaskModal = NiceModal.create<DeleteProjectTaskModalProps>(({ task }) => {
  const modal = useEnhancedModal()
  const mdUp = useMediaQuery(MediaQueries.MdUp, { ssr: false })
  const methods = useZodForm({
    schema: deleteProjectSchema,
    mode: 'all',
    defaultValues: {
      id: task.id,
    },
  })
  const title = 'Delete this task?'
  const canSubmit = !methods.formState.isSubmitting && methods.formState.isValid
  const onSubmit: SubmitHandler<DeleteProjectSchema> = async (values) => {
    if (!canSubmit) {
      return
    }
    const result = await deleteProjectTask(values)
    if (!result?.serverError && !result?.validationErrors) {
      toast.success('Task deleted')
      modal.handleClose()
    } else {
      toast.error("Task couldn't be deleted")
    }
  }
  const renderDescription = (
    <>
      The task <strong className='font-medium text-foreground'>{task.title}</strong> will be
      permanently deleted, are you sure you want to continue?
    </>
  )
  const renderForm = (
    <form className='hidden' onSubmit={methods.handleSubmit(onSubmit)}>
      <input
        type='hidden'
        className='hidden'
        disabled={methods.formState.isSubmitting}
        {...methods.register('id')}
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
        variant='destructive'
        disabled={!canSubmit || methods.formState.isSubmitting}
        onClick={methods.handleSubmit(onSubmit)}
      >
        {methods.formState.isSubmitting ? (
          <>
            <Spinner className='size-4 animate-spin' />
            <span>Deleting task...</span>
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
