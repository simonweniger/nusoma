'use client'

import * as React from 'react'
import { Button } from '@nusoma/design-system/components/ui/button'
import type { ProfileDto } from '@nusoma/types/dtos/profile-dto'
import type { TaskDto } from '@nusoma/types/dtos/task-dto'
import type {
  CommentTimelineEventDto,
  TimelineEventDto,
} from '@nusoma/types/dtos/timeline-event-dto'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { TaskTimelineActivity } from './task-timeline-activity'
import { TaskTimelineAddComment } from './task-timeline-add-comment'
import { TaskTimelineBlockExecution } from './task-timeline-block-execution'
import { TaskTimelineComment } from './task-timeline-comment'

const threshold = 6

interface TaskActivityProps {
  profile: ProfileDto
  task: TaskDto
  events: (TimelineEventDto | CommentTimelineEventDto)[]
}

export function TaskActivity({ profile, task, events }: TaskActivityProps): React.JSX.Element {
  const [showComments, setShowComments] = React.useState<boolean>(true)
  const [showMore, setShowMore] = React.useState<boolean>(false)

  const amount = showComments
    ? events.length
    : events.filter((event) => event.type !== 'comment').length
  const handleToggleShowMore = (): void => {
    setShowMore((value) => !value)
  }

  return (
    <div className='mx-auto size-full max-w-3xl grow py-6'>
      <div className='overflow-visible border-none bg-transparent'>
        <ul className='space-y-6'>
          <li className='relative flex gap-x-4'>
            <Line position='start' />
            <TaskTimelineAddComment
              profile={profile}
              task={task}
              showComments={showComments}
              onShowCommentsChange={setShowComments}
            />
          </li>
          {events
            .filter((event) => showComments || event.type !== 'comment')
            .slice(0, showMore ? amount : threshold)
            .map((event, index) => (
              <li key={event.id} className='relative flex gap-x-4 py-2'>
                <Line
                  position={
                    index === (showMore ? amount : Math.min(amount, threshold)) - 1
                      ? 'end'
                      : 'middle'
                  }
                />
                {event.type === 'activity' ? (
                  <TaskTimelineActivity event={event} />
                ) : event.type === 'block-execution' ? (
                  <TaskTimelineBlockExecution event={event} />
                ) : event.type === 'comment' ? (
                  <TaskTimelineComment profile={profile} event={event} taskId={task.id} />
                ) : null}
              </li>
            ))}
          {amount > threshold && (
            <li className='ml-8'>
              <Button type='button' variant='ghost' size='sm' onClick={handleToggleShowMore}>
                {showMore ? 'Show less' : 'Show more'}
                {showMore ? (
                  <ChevronUpIcon className='ml-1 size-4 shrink-0' />
                ) : (
                  <ChevronDownIcon className='ml-1 size-4 shrink-0' />
                )}
              </Button>
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}

type LineProps = {
  position: 'start' | 'middle' | 'end'
}

function Line({ position }: LineProps): React.JSX.Element {
  if (position === 'start') {
    return (
      <div className='-bottom-6 absolute top-3 left-0 flex w-6 justify-center'>
        <div className='w-px bg-gray-200 dark:bg-gray-800' />
      </div>
    )
  }

  if (position === 'middle') {
    return (
      <div className='-bottom-6 absolute top-0 left-0 flex w-6 justify-center'>
        <div className='w-px bg-gray-200 dark:bg-gray-800' />
      </div>
    )
  }

  return (
    <div className='absolute top-0 left-0 flex size-6 justify-center'>
      <div className='w-px bg-gray-200 dark:bg-gray-800' />
    </div>
  )
}
