'use client'

import type * as React from 'react'
import { ResponsiveScrollArea } from '@nusoma/design-system/components/ui/scroll-area'
import type { TaskDto } from '@nusoma/types/dtos/task-dto'
import { useQuery } from '@tanstack/react-query'
import { Editor } from '@/components/text-editor/editor'
import { createLogger } from '@/lib/logger/console-logger'
import { MediaQueries } from '@/lib/media-queries'
import { TaskActivityClient } from './task-activity-client'
import { TaskHeader } from './task-header'

const logger = createLogger('TaskActivityTab')

export type TaskActivityTabProps = {
  task: TaskDto
}

// API functions
async function fetchProfile() {
  const response = await fetch('/api/profile')
  if (!response.ok) {
    throw new Error('Failed to fetch profile')
  }
  return response.json()
}

async function fetchTaskTimelineEvents(taskId: string) {
  const response = await fetch(`/api/tasks/${taskId}/activities`)
  if (!response.ok) {
    logger.error('Failed to fetch timeline events', {
      status: response.status,
      statusText: response.statusText,
    })
    throw new Error('Failed to fetch timeline events')
  }
  const data = await response.json()
  logger.info('Fetched timeline events', { taskId, eventsCount: data.length })
  return data
}

export function TaskActivityTab({ task }: TaskActivityTabProps): React.JSX.Element {
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const {
    data: events,
    isLoading: eventsLoading,
    error: eventsError,
  } = useQuery({
    queryKey: ['task-timeline-events', task.id],
    queryFn: () => fetchTaskTimelineEvents(task.id),
    staleTime: 30 * 1000, // 30 seconds
  })

  const isLoading = profileLoading || eventsLoading
  const hasError = profileError || eventsError

  if (isLoading) {
    return (
      <ResponsiveScrollArea
        breakpoint={MediaQueries.MdUp}
        mediaQueryOptions={{ ssr: true }}
        className='h-full w-full'
      >
        <TaskHeader task={task} />
        <div className='flex items-center justify-center p-8'>
          <div className='text-muted-foreground text-sm'>Loading...</div>
        </div>
      </ResponsiveScrollArea>
    )
  }

  if (hasError) {
    return (
      <ResponsiveScrollArea
        breakpoint={MediaQueries.MdUp}
        mediaQueryOptions={{ ssr: true }}
        className='h-full w-full'
      >
        <TaskHeader task={task} />
        <div className='flex items-center justify-center p-8'>
          <div className='text-destructive text-sm'>
            Error: {(profileError || eventsError)?.message || 'Failed to load data'}
          </div>
        </div>
      </ResponsiveScrollArea>
    )
  }

  return (
    <ResponsiveScrollArea
      breakpoint={MediaQueries.MdUp}
      mediaQueryOptions={{ ssr: true }}
      className='h-full w-full'
    >
      <TaskHeader task={task} />
      <Editor
        initialContent={task.resultReport}
        taskData={{
          title: task.title,
          description: task.description,
          status: task.status,
          rawResult: task.rawResult,
        }}
      />
      <TaskActivityClient profile={profile} task={task} serverEvents={events} />
    </ResponsiveScrollArea>
  )
}
