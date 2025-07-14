'use client'

import * as React from 'react'
import NiceModal from '@ebay/nice-modal-react'
import { Avatar, AvatarFallback, AvatarImage } from '@nusoma/design-system/components/ui/avatar'
import { Button } from '@nusoma/design-system/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@nusoma/design-system/components/ui/dropdown-menu'
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  FormProvider,
} from '@nusoma/design-system/components/ui/form'
import { Input } from '@nusoma/design-system/components/ui/input'
import { toast } from '@nusoma/design-system/components/ui/sonner'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@nusoma/design-system/components/ui/tooltip'
import type { ProfileDto } from '@nusoma/types/dtos/profile-dto'
import type { CommentTimelineEventDto } from '@nusoma/types/dtos/timeline-event-dto'
import { format, formatDistanceToNow } from 'date-fns'
import { ClockIcon, MoreHorizontalIcon } from 'lucide-react'
import type { SubmitHandler } from 'react-hook-form'
import { getInitials } from '@/lib/formatters'
import { useUpdateTaskComment } from '@/hooks/use-tasks-api'
import { useZodForm } from '@/hooks/use-zod-form'
import {
  type UpdateTaskCommentSchema,
  updateTaskCommentSchema,
} from '@/schemas/tasks/update-task-comment-schema'
import { DeleteTaskCommentModal } from './delete-task-comment-modal'

type TaskTimelineCommentProps = {
  profile: ProfileDto
  event: CommentTimelineEventDto
  taskId: string
}

export function TaskTimelineComment({
  profile,
  event,
  taskId,
}: TaskTimelineCommentProps): React.JSX.Element {
  const [isEditing, setIsEditing] = React.useState<boolean>(false)
  const updateCommentMutation = useUpdateTaskComment()
  const form = useZodForm({
    schema: updateTaskCommentSchema,
    mode: 'all',
    defaultValues: {
      id: event.id,
      text: event.text,
    },
  })
  const canEdit = profile.id === event.sender.id
  const canSubmit =
    !form.formState.isLoading && form.formState.isValid && !updateCommentMutation.isPending
  const handleEdit = (): void => {
    setIsEditing(true)
  }
  const handleDelete = (): void => {
    NiceModal.show(DeleteTaskCommentModal, {
      comment: event,
      taskId: taskId,
    })
  }
  const handleCancel = (): void => {
    form.reset({ id: event.id, text: event.text })
    setIsEditing(false)
  }
  const onSubmit: SubmitHandler<UpdateTaskCommentSchema> = async (values) => {
    if (!canSubmit) {
      return
    }
    updateCommentMutation.mutate(
      { taskId: taskId, commentId: values.id, data: { text: values.text } },
      {
        onSuccess: () => {
          setIsEditing(false)
        },
        onError: () => {
          toast.error("Couldn't update comment")
        },
      }
    )
  }
  return (
    <>
      <Avatar className='relative mt-3 size-6 flex-none rounded-full'>
        <AvatarImage src={event.sender.image} alt={event.sender.name ?? 'avatar'} />
        <AvatarFallback className='size-6 text-[10px]'>
          {event.sender.name ? getInitials(event.sender.name) : ''}
        </AvatarFallback>
      </Avatar>
      <div className='mt-3 flex w-full flex-col'>
        <div className='mb-1 flex flex-row items-center justify-between'>
          <h3 className='font-medium text-xs'>
            {event.sender.name}{' '}
            <span className='font-normal text-muted-foreground'>commented.</span>
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type='button' variant='ghost' className='size-6 p-0' title='Open menu'>
                <MoreHorizontalIcon className='size-4 shrink-0' />
                <span className='sr-only'>Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem
                className='cursor-pointer'
                disabled={!canEdit || isEditing}
                onClick={handleEdit}
              >
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className='!text-destructive cursor-pointer' onClick={handleDelete}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className='flex flex-auto flex-row rounded-lg border p-4'>
          <div className='flex-1 px-2'>
            {isEditing ? (
              <FormProvider {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <div className='flex flex-col gap-2'>
                    <FormField
                      control={form.control}
                      name='text'
                      render={({ field }) => (
                        <FormItem className='flex w-full flex-col'>
                          <FormControl>
                            <Input {...field} placeholder='Edit comment...' />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className='flex flex-row items-center justify-end'>
                      <div className='flex flex-row gap-2'>
                        <Button type='button' variant='ghost' size='sm' onClick={handleCancel}>
                          Cancel
                        </Button>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          onClick={form.handleSubmit(onSubmit)}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  </div>
                </form>
              </FormProvider>
            ) : (
              <p className='whitespace-pre-line text-sm'>{event.text}</p>
            )}
          </div>
        </div>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <div className='mt-2 flex w-fit items-center space-x-1 text-muted-foreground text-xs'>
              <ClockIcon className='size-3 shrink-0' />
              <time suppressHydrationWarning>
                {formatDistanceToNow(event.createdAt, { addSuffix: true })}
              </time>
            </div>
          </TooltipTrigger>
          <TooltipContent>{format(event.createdAt, 'd MMM yyyy HH:mm:ss')}</TooltipContent>
        </Tooltip>
      </div>
    </>
  )
}
