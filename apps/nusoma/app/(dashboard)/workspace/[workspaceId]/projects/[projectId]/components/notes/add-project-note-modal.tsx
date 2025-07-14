'use client'

import NiceModal, { type NiceModalHocProps } from '@ebay/nice-modal-react'
import { Button } from '@nusoma/design-system/components/ui/button'
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
  FormMessage,
  FormProvider,
} from '@nusoma/design-system/components/ui/form'
import { toast } from '@nusoma/design-system/components/ui/sonner'
import { Spinner } from '@nusoma/design-system/components/ui/spinner'
import { TextEditor } from '@nusoma/design-system/components/ui/text-editor'
import { cn } from '@nusoma/design-system/lib/utils'
import type { SubmitHandler } from 'react-hook-form'
import { convertHtmlToMarkdown, convertMarkdownToHtml } from '@/lib/markdown'
import { MediaQueries } from '@/lib/media-queries'
import { addProjectNote } from '@/actions/projects/add-project-note'
import { useEnhancedModal } from '@/hooks/use-enhanced-modal'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useZodForm } from '@/hooks/use-zod-form'
import {
  type AddProjectNoteSchema,
  addProjectNoteSchema,
} from '@/schemas/projects/add-project-note-schema'

export type AddProjectNoteModalProps = NiceModalHocProps & {
  projectId: string
}

export const AddProjectNoteModal = NiceModal.create<AddProjectNoteModalProps>(({ projectId }) => {
  const modal = useEnhancedModal()
  const mdUp = useMediaQuery(MediaQueries.MdUp, { ssr: false })
  const methods = useZodForm({
    schema: addProjectNoteSchema,
    mode: 'onSubmit',
    defaultValues: {
      projectId,
      text: '',
    },
  })
  const title = 'Add note'
  const description = 'Create a new note by filling out the form below.'
  const canSubmit =
    !methods.formState.isSubmitting && (!methods.formState.isSubmitted || methods.formState.isDirty)
  const onSubmit: SubmitHandler<AddProjectNoteSchema> = async (values) => {
    if (!canSubmit) {
      return
    }
    const result = await addProjectNote(values)
    if (!result?.serverError && !result?.validationErrors) {
      toast.success('Note added')
      modal.handleClose()
    } else {
      toast.error("Couldn't add note")
    }
  }
  const renderForm = (
    <form className={cn('space-y-4', !mdUp && 'p-4')} onSubmit={methods.handleSubmit(onSubmit)}>
      <input
        type='hidden'
        className='hidden'
        disabled={methods.formState.isSubmitting}
        {...methods.register('projectId')}
      />
      <FormField
        control={methods.control}
        name='text'
        render={({ field }) => (
          <FormItem className='flex w-full flex-col'>
            <FormControl>
              <TextEditor
                getText={() => convertMarkdownToHtml(field.value || '')}
                setText={(value: string) => field.onChange(convertHtmlToMarkdown(value))}
                height='300px'
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
        disabled={!canSubmit || methods.formState.isSubmitting}
        onClick={methods.handleSubmit(onSubmit)}
      >
        {methods.formState.isSubmitting ? (
          <>
            <Spinner className='size-4 animate-spin' />
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
            className='max-w-xl'
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
