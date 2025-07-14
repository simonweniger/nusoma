'use client'

import NiceModal, { type NiceModalHocProps } from '@ebay/nice-modal-react'
import { Priority, ProjectStage } from '@nusoma/database/schema'
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
  FormLabel,
  FormMessage,
  FormProvider,
} from '@nusoma/design-system/components/ui/form'
import { Input } from '@nusoma/design-system/components/ui/input'
import { RadioCardItem, RadioCards } from '@nusoma/design-system/components/ui/radio-card'
import { toast } from '@nusoma/design-system/components/ui/sonner'
import { Spinner } from '@nusoma/design-system/components/ui/spinner'
import { Textarea } from '@nusoma/design-system/components/ui/textarea'
import { cn } from '@nusoma/design-system/lib/utils'
import { Signal, SignalHigh, SignalLow, SignalMedium } from 'lucide-react'
import type { SubmitHandler } from 'react-hook-form'
import { useSession } from '@/lib/auth-client'
import { priorityLabel } from '@/lib/labels'
import { createLogger } from '@/lib/logger/console-logger'
import { MediaQueries } from '@/lib/media-queries'
import { addProject } from '@/actions/projects/add-project'
import { useEnhancedModal } from '@/hooks/use-enhanced-modal'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useZodForm } from '@/hooks/use-zod-form'
import { type AddProjectSchema, addProjectSchema } from '@/schemas/projects/add-project-schema'
import { useWorkerRegistry } from '@/stores/workers/registry/store'

const logger = createLogger('AddProjectModal')

export type AddProjectModalProps = NiceModalHocProps

export const AddProjectModal = NiceModal.create<AddProjectModalProps>(() => {
  const modal = useEnhancedModal()
  const mdUp = useMediaQuery(MediaQueries.MdUp, { ssr: false })
  const { activeWorkspaceId } = useWorkerRegistry()
  const { data: session } = useSession()

  const methods = useZodForm({
    schema: addProjectSchema,
    mode: 'onSubmit',
    defaultValues: {
      priority: Priority.LOW,
      stage: ProjectStage.TODO,
      name: '',
      description: '',
      createdBy: session?.user?.id || '',
      workspaceId: activeWorkspaceId || '',
    },
  })

  const title = 'Add project'
  const description = 'Create a new project by filling out the form below.'
  const canSubmit =
    !methods.formState.isSubmitting && (!methods.formState.isSubmitted || methods.formState.isDirty)
  const onSubmit: SubmitHandler<AddProjectSchema> = async (values) => {
    if (!canSubmit) {
      return
    }
    const result = await addProject(values)
    if (!result?.serverError && !result?.validationErrors) {
      toast.success('Project added')
      modal.handleClose()
    } else {
      logger.error('Failed to add project:', result)
      toast.error("Couldn't add project")
    }
  }
  const renderForm = (
    <form className={cn('space-y-4', !mdUp && 'p-4')} onSubmit={methods.handleSubmit(onSubmit)}>
      <FormField
        control={methods.control}
        name='priority'
        render={({ field }) => (
          <FormItem className='flex w-full flex-col'>
            <FormLabel>Record</FormLabel>
            <FormControl>
              <RadioCards
                value={field.value}
                onValueChange={field.onChange}
                className='grid grid-cols-1 gap-4 sm:grid-cols-2'
                disabled={methods.formState.isSubmitting}
              >
                {records.map((record) => (
                  <RadioCardItem key={record.value} value={record.value} className='p-3'>
                    <div className='flex flex-row items-center gap-2 px-2 font-medium text-sm'>
                      {record.icon}
                      {record.label}
                    </div>
                  </RadioCardItem>
                ))}
              </RadioCards>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={methods.control}
        name='name'
        render={({ field }) => (
          <FormItem className='flex w-full flex-col'>
            <FormLabel required>Name</FormLabel>
            <FormControl>
              <Input
                type='text'
                maxLength={64}
                required
                disabled={methods.formState.isSubmitting}
                {...field}
              />
            </FormControl>
            {(methods.formState.touchedFields.name || methods.formState.submitCount > 0) && (
              <FormMessage />
            )}
          </FormItem>
        )}
      />
      <FormField
        control={methods.control}
        name='description'
        render={({ field }) => (
          <FormItem className='flex w-full flex-col'>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea maxLength={255} disabled={methods.formState.isSubmitting} {...field} />
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
        disabled={!canSubmit}
        onClick={methods.handleSubmit(onSubmit)}
      >
        {methods.formState.isSubmitting ? (
          <>
            <Spinner className='size-4' /> Loading...
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
            className='max-w-sm'
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

const records = [
  {
    value: Priority.LOW,
    label: priorityLabel[Priority.LOW],
    icon: <SignalLow className='size-4 shrink-0 text-muted-foreground' />,
  },
  {
    value: Priority.MEDIUM,
    label: priorityLabel[Priority.MEDIUM],
    icon: <SignalMedium className='size-4 shrink-0 text-muted-foreground' />,
  },
  {
    value: Priority.HIGH,
    label: priorityLabel[Priority.HIGH],
    icon: <SignalHigh className='size-4 shrink-0 text-muted-foreground' />,
  },
  {
    value: Priority.URGENT,
    label: priorityLabel[Priority.URGENT],
    icon: <Signal className='size-4 shrink-0 text-muted-foreground' />,
  },
]
