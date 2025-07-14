'use client'

import * as React from 'react'
import { Button } from '@nusoma/design-system/components/ui/button'
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  FormProvider,
} from '@nusoma/design-system/components/ui/form'
import { Input } from '@nusoma/design-system/components/ui/input'
import { toast } from '@nusoma/design-system/components/ui/sonner'
import { TextEditor } from '@nusoma/design-system/components/ui/text-editor'
import type { TaskDto } from '@nusoma/types/dtos/task-dto'
import type { SubmitHandler } from 'react-hook-form'
import { convertMarkdownToHtml } from '@/lib/markdown'
import { useUpdateTask } from '@/hooks/use-tasks-api'
import { useZodForm } from '@/hooks/use-zod-form'
import {
  type UpdateTaskPropertiesSchema,
  updateTaskPropertiesSchema,
} from '@/schemas/tasks/update-task-properties-schema'

export type TaskHeaderProps = {
  task: TaskDto
}

export function TaskHeader({ task }: TaskHeaderProps): React.JSX.Element {
  const [editingField, setEditingField] = React.useState<'title' | 'description' | null>(null)
  const updateTaskMutation = useUpdateTask()

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

  const onSubmit: SubmitHandler<UpdateTaskPropertiesSchema> = async (values) => {
    try {
      // Extract the task ID and create the update data
      const { id, ...updateData } = values

      // Convert scheduleDate from Date to string if it exists
      const dataWithStringDate = {
        ...updateData,
        scheduleDate: updateData.scheduleDate ? updateData.scheduleDate.toISOString() : undefined,
      }

      await updateTaskMutation.mutateAsync({
        taskId: id,
        data: dataWithStringDate,
      })

      toast.success('Task updated')
      setEditingField(null)
    } catch (error) {
      toast.error("Couldn't update task")
      console.error('Failed to update task:', error)
    }
  }

  const handleFieldClick = (field: 'title' | 'description') => {
    setEditingField(field)
  }

  const handleSave = () => {
    methods.handleSubmit(onSubmit)()
  }

  const handleCancel = () => {
    methods.reset()
    setEditingField(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent, field: 'title' | 'description') => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const isSubmitting = methods.formState.isSubmitting || updateTaskMutation.isPending

  return (
    <FormProvider {...methods}>
      <div className='mx-auto w-full max-w-3xl py-12'>
        <div className='space-y-4'>
          {/* Task Title */}
          {editingField === 'title' ? (
            <div className='space-y-3'>
              <FormField
                control={methods.control}
                name='title'
                render={({ field }) => (
                  <FormItem className='flex w-full flex-col text-3xl'>
                    <FormControl>
                      <Input
                        {...field}
                        autoFocus
                        className='-mx-1 border-none bg-transparent px-1 py-1 font-semibold text-3xl text-foreground leading-tight focus-visible:ring-0 focus-visible:ring-offset-0'
                        onKeyDown={(e) => handleKeyDown(e, 'title')}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className='flex gap-2'>
                <Button type='button' size='xs' onClick={handleSave} disabled={isSubmitting}>
                  Save
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='xs'
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <h1
              className='-mx-1 cursor-text rounded px-1 py-1 font-semibold text-3xl text-foreground leading-tight transition-colors hover:bg-muted/50'
              onClick={() => handleFieldClick('title')}
            >
              {task.title}
            </h1>
          )}

          {/* Task Description */}
          {editingField === 'description' ? (
            <div className='space-y-3'>
              <FormField
                control={methods.control}
                name='description'
                render={({ field }) => (
                  <FormItem className='flex w-full flex-col'>
                    <FormControl>
                      <TextEditor
                        getText={() => field.value || ''}
                        setText={(value: string) => field.onChange(value)}
                        height='200px'
                        placeholder='Add a description...'
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className='flex gap-2'>
                <Button type='button' size='xs' onClick={handleSave} disabled={isSubmitting}>
                  Save
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='xs'
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div
              className='-mx-1 min-h-[20px] cursor-text rounded px-1 py-1 text-base text-muted-foreground leading-relaxed transition-colors hover:bg-muted/50'
              onClick={() => handleFieldClick('description')}
            >
              {task.description ? (
                <div
                  className='[&_h1]:mb-5 [&_h1]:font-bold [&_h1]:text-[25px] [&_h2]:mb-5 [&_h2]:font-bold [&_h2]:text-xl [&_li]:mx-8 [&_li]:my-0 [&_ol]:mb-3 [&_p:last-child]:mb-0 [&_p]:relative [&_p]:m-0 [&_ul]:mb-3'
                  dangerouslySetInnerHTML={{
                    __html: convertMarkdownToHtml(task.description),
                  }}
                />
              ) : (
                <span className='italic opacity-70'>Add a description...</span>
              )}
            </div>
          )}

          {/* Add Sub-issues Button */}
          {/* <Button
                        variant='ghost'
                        size='sm'
                        className='h-auto p-2 font-normal text-muted-foreground hover:text-foreground'
                    >
                        <Plus className='mr-2 h-4 w-4' />
                        Add sub-issues
                    </Button> */}
        </div>
      </div>
    </FormProvider>
  )
}
