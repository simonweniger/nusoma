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
import type { ProjectDto } from '@nusoma/types/dtos/project-dto'
import type { SubmitHandler } from 'react-hook-form'
import { MediaQueries } from '@/lib/media-queries'
import { deleteProjects } from '@/actions/projects/delete-projects'
import { useEnhancedModal } from '@/hooks/use-enhanced-modal'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useZodForm } from '@/hooks/use-zod-form'
import {
  type DeleteProjectsSchema,
  deleteProjectsSchema,
} from '@/schemas/projects/delete-projects-schema'

export type DeleteProjectsModalProps = NiceModalHocProps & {
  projects: ProjectDto[]
}

export const DeleteProjectsModal = NiceModal.create<DeleteProjectsModalProps>(({ projects }) => {
  const modal = useEnhancedModal()
  const mdUp = useMediaQuery(MediaQueries.MdUp, { ssr: false })
  const methods = useZodForm({
    schema: deleteProjectsSchema,
    mode: 'all',
    defaultValues: {
      ids: projects.map((project) => project.id),
    },
  })
  const amount = projects.length
  const subject = amount === 1 ? 'Project' : 'Projects'
  const title = `Delete ${subject.toLowerCase()}?`
  const canSubmit = !methods.formState.isSubmitting && methods.formState.isValid
  const onSubmit: SubmitHandler<DeleteProjectsSchema> = async (values) => {
    if (!canSubmit) {
      return
    }
    const result = await deleteProjects(values)
    if (!result?.serverError && !result?.validationErrors) {
      toast.success(`${subject} deleted`)
      modal.handleClose()
    } else {
      toast.error(`${subject} couldn't be deleted`)
    }
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
        disabled={!canSubmit}
        onClick={methods.handleSubmit(onSubmit)}
      >
        {methods.formState.isSubmitting ? (
          <>
            <Spinner className='size-4' /> Loading...
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
            onAnimationEndCapture={modal.handleAnimationEndCapture}
            onClose={modal.handleClose}
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
