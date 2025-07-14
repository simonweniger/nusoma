'use client'

import * as React from 'react'
import { Button } from '@nusoma/design-system/components/ui/button'
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@nusoma/design-system/components/ui/form'
import { Input } from '@nusoma/design-system/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@nusoma/design-system/components/ui/select'
import { toast } from '@nusoma/design-system/components/ui/sonner'
import { Textarea } from '@nusoma/design-system/components/ui/textarea'
import type { TaskDto } from '@nusoma/types/dtos/task-dto'
import { IdCardIcon, MailIcon, SquareDashedKanbanIcon } from 'lucide-react'
import { FormProvider, type SubmitHandler } from 'react-hook-form'
import { priorities } from '@/lib/labels'
import { useUpdateTaskProperties } from '@/hooks/use-tasks-api'
import { useZodForm } from '@/hooks/use-zod-form'
import {
  type UpdateTaskPropertiesSchema,
  updateTaskPropertiesSchema,
} from '@/schemas/tasks/update-task-properties-schema'

export type TaskDetailsSectionProps = React.HtmlHTMLAttributes<HTMLDivElement> & {
  task: TaskDto
}

export function TaskDetailsSection({
  task,
  ...others
}: TaskDetailsSectionProps): React.JSX.Element {
  return (
    <section {...others}>
      <Properties {...task} />
    </section>
  )
}

function Properties(task: TaskDto): React.JSX.Element {
  const [editMode, setEditMode] = React.useState<boolean>(false)
  const updateTaskPropertiesMutation = useUpdateTaskProperties()
  const methods = useZodForm({
    schema: updateTaskPropertiesSchema,
    mode: 'onSubmit',
    defaultValues: {
      id: task.id,
      status: task.status,
      priority: task.priority,
      tags: task.tags?.map((t) => t.text) ?? [],
      scheduleDate: task.scheduleDate || undefined,
      assigneeId: task.assigneeId || undefined,
      title: task.title,
      description: task.description || undefined,
      projectId: task.projectId || undefined,
    },
  })
  const selectedPriority = priorities.find((p) => p.id === task.priority)
  const canSubmit = !methods.formState.isSubmitting && !updateTaskPropertiesMutation.isPending
  const handleEnableEditMode = async (): Promise<void> => {
    setEditMode(true)
  }
  const handleCancel = async (): Promise<void> => {
    methods.reset(methods.formState.defaultValues)
    setEditMode(false)
  }
  const onSubmit: SubmitHandler<UpdateTaskPropertiesSchema> = async (values) => {
    if (!canSubmit) {
      return
    }
    updateTaskPropertiesMutation.mutate(
      {
        taskId: values.id,
        properties: {
          ...values,
          scheduleDate: values.scheduleDate?.toISOString(),
        },
      },
      {
        onSuccess: () => {
          toast.success('Properties updated')
          setEditMode(false)
        },
        onError: () => {
          toast.error("Couldn't update properties")
        },
      }
    )
  }
  return (
    <FormProvider {...methods}>
      <form className='space-y-2 p-6' onSubmit={methods.handleSubmit(onSubmit)}>
        <div className='flex items-center justify-between'>
          <h3 className='font-semibold text-sm tracking-tight'>Properties</h3>
          {editMode ? (
            <div>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='min-w-fit text-success hover:text-success'
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='min-w-fit text-success hover:text-success'
                disabled={!canSubmit}
                onClick={methods.handleSubmit(onSubmit)}
              >
                Save
              </Button>
            </div>
          ) : (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='min-w-fit text-success hover:text-success'
              disabled={methods.formState.isSubmitting}
              onClick={handleEnableEditMode}
            >
              Edit
            </Button>
          )}
        </div>
        <dl className='space-y-4 text-sm'>
          <Property
            icon={<IdCardIcon className='size-3 shrink-0' />}
            term='Name'
            details={
              editMode ? (
                <FormField
                  control={methods.control}
                  name='title'
                  render={({ field }) => (
                    <FormItem className='flex w-full flex-col'>
                      <FormControl>
                        <Input
                          type='text'
                          maxLength={70}
                          required
                          className='h-7'
                          disabled={methods.formState.isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                task.title
              )
            }
            placeholder='No name available'
          />
          <Property
            icon={<MailIcon className='size-3 shrink-0' />}
            term='Description'
            details={
              editMode ? (
                <FormField
                  control={methods.control}
                  name='description'
                  render={({ field }) => (
                    <FormItem className='flex w-full flex-col'>
                      <FormControl>
                        <Textarea
                          maxLength={255}
                          required
                          className='h-20'
                          disabled={methods.formState.isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                task.description
              )
            }
            placeholder='No description available'
          />
          <Property
            icon={<SquareDashedKanbanIcon className='size-3 shrink-0' />}
            term='Priority'
            details={
              editMode ? (
                <FormField
                  control={methods.control}
                  name='priority'
                  render={({ field }) => (
                    <FormItem className='flex w-full flex-col'>
                      <FormControl>
                        <Select
                          required
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={methods.formState.isSubmitting}
                        >
                          <SelectTrigger className='h-7 w-full'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {priorities.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                <div className='flex items-center gap-2'>
                                  <p.icon className='size-4' />
                                  <span>{p.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className='flex items-center gap-2'>
                  {selectedPriority?.icon && <selectedPriority.icon className='size-4' />}
                  <span>{selectedPriority?.name}</span>
                </div>
              )
            }
            placeholder='No priority available'
          />
        </dl>
      </form>
    </FormProvider>
  )
}

type PropertyProps = {
  icon: React.ReactNode
  term: string
  details?: React.ReactNode
  placeholder: string
}

function Property({ icon, term, details, placeholder }: PropertyProps): React.JSX.Element {
  return (
    <div className='flex flex-col items-start whitespace-nowrap'>
      <dt className='flex h-7 min-w-24 flex-row items-center gap-2 text-muted-foreground'>
        {icon}
        {term}
      </dt>
      <dd className='flex w-full max-w-[196px] flex-row items-center overflow-hidden text-ellipsis'>
        {details ? details : <p className='text-muted-foreground opacity-65'>{placeholder}</p>}
      </dd>
    </div>
  )
}
