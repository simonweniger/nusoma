'use client'

import type * as React from 'react'
import { useId, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@nusoma/design-system/components/ui/avatar'
import { Button } from '@nusoma/design-system/components/ui/button'
import { Card, type CardProps } from '@nusoma/design-system/components/ui/card'
import { Checkbox } from '@nusoma/design-system/components/ui/checkbox'
import {
  EmojiPicker,
  EmojiPickerContent,
  EmojiPickerSearch,
} from '@nusoma/design-system/components/ui/emoji-picker'
import {
  FormControl,
  FormField,
  FormItem,
  FormProvider,
} from '@nusoma/design-system/components/ui/form'
import { Input } from '@nusoma/design-system/components/ui/input'
import { Label } from '@nusoma/design-system/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@nusoma/design-system/components/ui/popover'
import { Separator } from '@nusoma/design-system/components/ui/separator'
import { toast } from '@nusoma/design-system/components/ui/sonner'
import { cn } from '@nusoma/design-system/lib/utils'
import type { ProfileDto } from '@nusoma/types/dtos/profile-dto'
import type { TaskDto } from '@nusoma/types/dtos/task-dto'
import { SmileIcon } from 'lucide-react'
import type { SubmitHandler } from 'react-hook-form'
import { getInitials } from '@/lib/formatters'
import { useCreateTaskComment } from '@/hooks/use-tasks-api'
import { useZodForm } from '@/hooks/use-zod-form'
import {
  type AddTaskCommentSchema,
  addTaskCommentSchema,
} from '@/schemas/tasks/add-task-comment-schema'

export type TaskTimelineAddCommentCardProps = CardProps & {
  profile: ProfileDto
  task: TaskDto
  showComments: boolean
  onShowCommentsChange: React.Dispatch<React.SetStateAction<boolean>>
}

export function TaskTimelineAddComment({
  profile,
  task,
  className,
  showComments,
  onShowCommentsChange,
  ...other
}: TaskTimelineAddCommentCardProps): React.JSX.Element {
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const createCommentMutation = useCreateTaskComment()
  const showCommentId = useId()

  const methods = useZodForm({
    schema: addTaskCommentSchema,
    mode: 'all',
    defaultValues: {
      taskId: task.id,
      text: '',
    },
  })
  const canSubmit =
    !methods.formState.isSubmitting && methods.formState.isValid && !createCommentMutation.isPending

  const handleEmojiSelected = (emoji: { emoji: string }) => {
    methods.setValue('text', methods.getValues('text') + emoji.emoji, {
      shouldValidate: true,
    })
    setIsEmojiPickerOpen(false)
  }

  const onSubmit: SubmitHandler<AddTaskCommentSchema> = async (values): Promise<void> => {
    if (!canSubmit) {
      return
    }
    createCommentMutation.mutate(
      { taskId: values.taskId, data: { text: values.text } },
      {
        onSuccess: () => {
          methods.reset(methods.formState.defaultValues)
        },
        onError: () => {
          toast.error("Couldn't add comment")
        },
      }
    )
  }
  return (
    <>
      <Avatar title={profile.name} className='relative mt-3 ml-0.5 size-6 flex-none rounded-full'>
        <AvatarImage src={profile.image} alt='avatar' />
        <AvatarFallback className='size-6 text-[10px]'>{getInitials(profile.name)}</AvatarFallback>
      </Avatar>
      <div className='flex flex-auto flex-col gap-2'>
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)}>
            <Card className={cn('rounded-lg', className)} {...other}>
              <input type='hidden' className='hidden' {...methods.register('taskId')} />
              <FormField
                control={methods.control}
                name='text'
                render={({ field }) => (
                  <FormItem className='flex w-full items-center px-4 py-2'>
                    <FormControl>
                      <Input
                        type='text'
                        className='w-full flex-1 border-0 shadow-none outline-0'
                        placeholder='Leave a comment...'
                        maxLength={2000}
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Separator />
              <div className='flex items-center justify-between px-3 py-1 text-muted-foreground'>
                <div className='flex flex-row gap-2'>
                  <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button type='button' variant='ghost' size='sm' className='h-8 w-8 p-0'>
                        <SmileIcon className='h-4 w-4' />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className='w-80 p-0' align='start'>
                      <EmojiPicker className='h-80 border-0' onEmojiSelect={handleEmojiSelected}>
                        <EmojiPickerSearch />
                        <EmojiPickerContent />
                      </EmojiPicker>
                    </PopoverContent>
                  </Popover>
                </div>
                <Button type='submit' variant='default' size='sm' disabled={!canSubmit}>
                  Post
                </Button>
              </div>
            </Card>
          </form>
        </FormProvider>
        <div className='flex items-center justify-end'>
          <div className='flex flex-row items-center gap-1.5 p-1'>
            <Checkbox
              id={showCommentId}
              checked={showComments}
              onCheckedChange={() => onShowCommentsChange((prev) => !prev)}
            />
            <Label htmlFor={showCommentId} className='cursor-pointer text-xs'>
              Show comments
            </Label>
          </div>
        </div>
      </div>
    </>
  )
}
