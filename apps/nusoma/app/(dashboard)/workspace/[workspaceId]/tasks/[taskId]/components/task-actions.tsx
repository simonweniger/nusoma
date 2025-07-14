'use client'

import type * as React from 'react'
import type { TaskDto } from '@nusoma/types/dtos/task-dto'
import { useTaskIsInFavorites } from '@/hooks/use-favorites-api'
import { TaskFavoriteToggle } from './task-favorite-toggle'

export type TaskActionsProps = React.HtmlHTMLAttributes<HTMLDivElement> & {
  task: TaskDto
}

export function TaskActions({ task }: TaskActionsProps): React.JSX.Element {
  const { data: isInFavorites } = useTaskIsInFavorites(task.id)

  return (
    <div className='flex flex-row items-center gap-2'>
      <TaskFavoriteToggle task={task} addedToFavorites={isInFavorites || false} />
    </div>
  )
}
