'use client'

import type * as React from 'react'
import {
  FormControl,
  FormField,
  FormItem,
  FormProvider,
} from '@nusoma/design-system/components/ui/form'
import { toast } from '@nusoma/design-system/components/ui/sonner'
import { TagInput } from '@nusoma/design-system/components/ui/tag-input'
import type { TaskDto } from '@nusoma/types/dtos/task-dto'
import type { SubmitHandler } from 'react-hook-form'
import { useUpdateTaskTags } from '@/hooks/use-tasks-api'
import { useZodForm } from '@/hooks/use-zod-form'
import {
  type UpdateTaskTagsSchema,
  updateTaskTagsSchema,
} from '@/schemas/tasks/update-task-tags-schema'

export type TaskTagsSectionProps = React.HtmlHTMLAttributes<HTMLDivElement> & {
  task: TaskDto
}

export function TaskTagsSection({ task, ...other }: TaskTagsSectionProps): React.JSX.Element {
  const updateTagsMutation = useUpdateTaskTags()
  const methods = useZodForm({
    schema: updateTaskTagsSchema,
    mode: 'all',
    defaultValues: {
      id: task.id,
      labels: task.tags,
    },
  })
  const onSubmit: SubmitHandler<UpdateTaskTagsSchema> = async (values) => {
    updateTagsMutation.mutate(
      { taskId: values.id, tags: values.labels.map((tag) => tag.text) },
      {
        onSuccess: () => {
          // Success toast is handled by the hook
        },
        onError: () => {
          toast.error("Couldn't update tags")
        },
      }
    )
  }
  return (
    <FormProvider {...methods}>
      <section {...other}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>
          <div className='flex h-14 flex-row items-center p-6'>
            <h3 className='font-semibold text-sm tracking-tight'>Tags</h3>
          </div>
          <div className='p-6 pt-0'>
            <FormField
              name='labels'
              control={methods.control}
              render={({ field }) => (
                <FormItem className='flex flex-col gap-4'>
                  <FormControl>
                    <TagInput
                      {...field}
                      allowDuplicates={false}
                      inputFieldPosition='top'
                      placeholder='Type your tag and press enter'
                      tags={field.value}
                      onTagsChange={(values) => {
                        field.onChange(values)
                        onSubmit(methods.getValues())
                      }}
                      size='sm'
                      variant='default'
                      shape='rounded'
                      borderStyle='default'
                      textCase={null}
                      textStyle='normal'
                      animation='fadeIn'
                      direction='row'
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </form>
      </section>
    </FormProvider>
  )
}
