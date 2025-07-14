'use client'

import type * as React from 'react'
import { ResponsiveScrollArea } from '@nusoma/design-system/components/ui/scroll-area'
import type { TaskDto } from '@nusoma/types/dtos/task-dto'
import { MediaQueries } from '@/lib/media-queries'
import { TaskAssigneeSection } from './task-assignee-section'
import { TaskDetailsSection } from './task-details-section'
import { TaskStatusSection } from './task-status-section'
import { TaskTagsSection } from './task-tags-section'

export type TaskMetaProps = {
  task: TaskDto
}

export function TaskMeta({ task }: TaskMetaProps): React.JSX.Element {
  return (
    <ResponsiveScrollArea
      breakpoint={MediaQueries.MdUp}
      mediaQueryOptions={{ ssr: true }}
      className='h-full'
    >
      <div className='size-full w-[260px] divide-y border-b'>
        <TaskDetailsSection task={task} />
        <TaskAssigneeSection task={task} />
        <TaskStatusSection task={task} />
        <TaskTagsSection task={task} />
      </div>
    </ResponsiveScrollArea>
  )
}
