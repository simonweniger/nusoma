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
import type { CommentTimelineEventDto } from '@nusoma/types/dtos/timeline-event-dto'
import { Loader2 } from 'lucide-react'
import type { SubmitHandler } from 'react-hook-form'
import { MediaQueries } from '@/lib/media-queries'
import { useEnhancedModal } from '@/hooks/use-enhanced-modal'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useDeleteTaskComment } from '@/hooks/use-tasks-api'
import { useZodForm } from '@/hooks/use-zod-form'
import { deleteTaskCommentSchema } from '@/schemas/tasks/delete-task-comment-schema'
import type { DeleteTaskSchema } from '@/schemas/tasks/delete-task-schema'

export type DeleteTaskCommentModalProps = NiceModalHocProps & {
  comment: CommentTimelineEventDto
  taskId: string
}

export const DeleteTaskCommentModal = NiceModal.create<DeleteTaskCommentModalProps>(
  ({ comment, taskId }) => {
    const modal = useEnhancedModal()
    const mdUp = useMediaQuery(MediaQueries.MdUp, { ssr: false })
    const deleteCommentMutation = useDeleteTaskComment()
    const methods = useZodForm({
      schema: deleteTaskCommentSchema,
      mode: 'all',
      defaultValues: {
        id: comment.id,
      },
    })
    const title = 'Delete this comment?'
    const canSubmit =
      !methods.formState.isSubmitting &&
      methods.formState.isValid &&
      !deleteCommentMutation.isPending
    const onSubmit: SubmitHandler<DeleteTaskSchema> = async (values) => {
      if (!canSubmit) {
        return
      }
      deleteCommentMutation.mutate(
        { taskId: taskId, commentId: values.id },
        {
          onSuccess: () => {
            toast.success('Comment deleted')
            modal.handleClose()
          },
          onError: () => {
            toast.error("Comment couldn't be deleted")
          },
        }
      )
    }
    const renderDescription = (
      <>
        The comment by{' '}
        <strong className='font-medium text-foreground'>{comment.sender.name}</strong> will be
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
  }
)
