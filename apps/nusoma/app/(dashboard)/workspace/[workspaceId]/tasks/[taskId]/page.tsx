'use client'

import * as React from 'react'
import {
  Page,
  PageBody,
  PageHeader,
  PagePrimaryBar,
  PageTitle,
} from '@nusoma/design-system/components/ui/page'
import { useTask } from '@/hooks/use-tasks-api'
import { TaskActions } from './components/task-actions'
import { TaskMeta } from './components/task-meta'
import { TaskActivityTab } from './components/timeline/task-activity-tab'

interface TaskPageProps {
  params: Promise<{ taskId: string }>
}

export default function TaskPage({ params }: TaskPageProps): React.JSX.Element {
  const [taskId, setTaskId] = React.useState<string | null>(null)

  // Unwrap params
  React.useEffect(() => {
    params.then(({ taskId }) => setTaskId(taskId))
  }, [params])

  const { data: task, isLoading, error } = useTask(taskId || '')

  if (!taskId) {
    return (
      <Page>
        <PageHeader>
          <PagePrimaryBar>
            <PageTitle>Task not found</PageTitle>
          </PagePrimaryBar>
        </PageHeader>
        <PageBody>
          <div className='flex h-full items-center justify-center'>
            <p className='text-muted-foreground'>Task ID not provided</p>
          </div>
        </PageBody>
      </Page>
    )
  }

  if (isLoading) {
    return (
      <Page>
        <PageHeader>
          <PagePrimaryBar>
            <PageTitle>Loading...</PageTitle>
          </PagePrimaryBar>
        </PageHeader>
        <PageBody>
          <div className='flex h-full items-center justify-center'>
            <div className='text-center'>
              <div className='h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600' />
              <p className='mt-2 text-muted-foreground text-sm'>Loading task...</p>
            </div>
          </div>
        </PageBody>
      </Page>
    )
  }

  if (error || !task) {
    return (
      <Page>
        <PageHeader>
          <PagePrimaryBar>
            <PageTitle>Task not found</PageTitle>
          </PagePrimaryBar>
        </PageHeader>
        <PageBody>
          <div className='flex h-full items-center justify-center'>
            <div className='text-center'>
              <h2 className='font-semibold text-foreground text-lg'>Task not found</h2>
              <p className='text-muted-foreground text-sm'>
                The task you're looking for doesn't exist or you don't have permission to view it.
              </p>
            </div>
          </div>
        </PageBody>
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader>
        <PagePrimaryBar>
          <PageTitle>{task.title}</PageTitle>
          <TaskActions task={task} />
        </PagePrimaryBar>
      </PageHeader>
      <PageBody
        disableScroll
        className='flex h-full flex-col overflow-auto md:flex-row md:divide-x md:overflow-hidden'
      >
        <div className='w-full'>
          <TaskActivityTab task={task} />
        </div>
        <TaskMeta task={task} />
      </PageBody>
    </Page>
  )
}
