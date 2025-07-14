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
import { deleteProject } from '@/actions/projects/delete-project'
import { useEnhancedModal } from '@/hooks/use-enhanced-modal'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useZodForm } from '@/hooks/use-zod-form'
import {
  type DeleteProjectSchema,
  deleteProjectSchema,
} from '@/schemas/projects/delete-project-schema'

export type DeleteProjectModalProps = NiceModalHocProps & {
  project: ProjectDto
}

export const DeleteProjectModal = NiceModal.create<DeleteProjectModalProps>(({ project }) => {
  const modal = useEnhancedModal()
  const mdUp = useMediaQuery(MediaQueries.MdUp, { ssr: false })
  const methods = useZodForm({
    schema: deleteProjectSchema,
    mode: 'all',
    defaultValues: {
      id: project.id,
    },
  })
  const title = 'Delete this project?'
  const canSubmit = !methods.formState.isSubmitting && methods.formState.isValid
  const onSubmit: SubmitHandler<DeleteProjectSchema> = async (values) => {
    if (!canSubmit) {
      return
    }
    const result = await deleteProject(values)
    if (!result?.serverError && !result?.validationErrors) {
      toast.success('Project deleted')
      modal.resolve(true)
      modal.handleClose()
    } else {
      toast.error("Project couldn't be deleted")
    }
  }
  const renderDescription = (
    <>
      The project <strong className='font-medium text-foreground'>{project.name}</strong> will be
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
