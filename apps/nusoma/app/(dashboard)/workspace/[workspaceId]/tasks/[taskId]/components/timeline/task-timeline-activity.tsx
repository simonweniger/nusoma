/** biome-ignore-all lint/performance/noImgElement: needed here */
'use client'

import * as React from 'react'
import { ActionType } from '@nusoma/database/schema'
import { Avatar, AvatarFallback, AvatarImage } from '@nusoma/design-system/components/ui/avatar'
import { Badge } from '@nusoma/design-system/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@nusoma/design-system/components/ui/tooltip'
import { cn } from '@nusoma/design-system/lib/utils'
import type { ActivityTimelineEventDto } from '@nusoma/types/dtos/timeline-event-dto'
import { format, formatDistanceToNow } from 'date-fns'
import { ArrowRightIcon, ClockIcon } from 'lucide-react'
import { capitalize, getInitials } from '@/lib/formatters'
import { taskStatusLabel } from '@/lib/labels'

export interface TaskTimelineActivityProps {
  event: ActivityTimelineEventDto
}

export function TaskTimelineActivity({ event }: TaskTimelineActivityProps): React.JSX.Element {
  const changes = React.useMemo(() => {
    if (!event.metadata) {
      return null
    }
    return Object.entries(event.metadata).map(([key, value]) => ({
      key,
      oldValue: value.old || 'Empty',
      newValue: value.new || 'Empty',
    }))
  }, [event.metadata])

  return (
    <div className='flex w-full items-start space-x-4'>
      {event.actor.image ? (
        <Avatar title={event.actor.name} className='relative ml-0.5 size-6 flex-none rounded-full'>
          <AvatarImage src={event.actor.image} alt='avatar' />
          <AvatarFallback className='size-6 text-[10px]'>
            {getInitials(event.actor.name)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className='relative ml-0.5 flex size-5 flex-none items-center justify-center'>
          <img src='/nusoma.png' alt='Nusoma' className='size-5' />
        </div>
      )}
      <div className='min-w-0 grow space-y-2'>
        <h3 className='font-medium text-xs'>
          {event.actor.name || 'System'}{' '}
          <span className='font-normal text-muted-foreground'>
            {actionTypeToText[event.actionType]}
          </span>
        </h3>
        {changes && (
          <div className='space-y-2 rounded-lg border p-4'>
            {changes.map(({ key, oldValue, newValue }) => (
              <div key={key} className='flex w-full flex-col gap-2'>
                <span className='block font-medium text-muted-foreground text-xs'>
                  {capitalize(key)}
                </span>
                <div className='flex w-full flex-row items-center gap-2'>
                  <div className='min-w-0 flex-1'>
                    <ValueBadge property={key} value={oldValue} variant='Old' />
                  </div>
                  <ArrowRightIcon
                    className='block size-3 shrink-0 text-muted-foreground opacity-65'
                    aria-hidden='true'
                  />
                  <div className='min-w-0 flex-1'>
                    <ValueBadge property={key} value={newValue} variant='New' />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <div className='flex w-fit items-center space-x-1 text-muted-foreground text-xs'>
              <ClockIcon className='size-3 shrink-0' />
              <time suppressHydrationWarning>
                {formatDistanceToNow(event.occurredAt, { addSuffix: true })}
              </time>
            </div>
          </TooltipTrigger>
          <TooltipContent>{format(event.occurredAt, 'd MMM yyyy HH:mm:ss')}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}

const actionTypeToText: Record<ActionType, string> = {
  [ActionType.CREATE]: 'created the task.',
  [ActionType.UPDATE]: 'updated the task.',
  [ActionType.DELETE]: 'deleted the task.',
  [ActionType.EDIT]: 'edited the task.',
  [ActionType.TASK_IN_QUEUE]: 'added the task to the queue.',
  [ActionType.TASK_REMOVED_FROM_QUEUE]: 'removed the task from the queue.',
  [ActionType.ASSIGN_WORKER]: 'assigned the task to a worker.',
  [ActionType.UNASSIGN_WORKER]: 'unassigned the task from a worker.',
  [ActionType.TASK_EXECUTED]: 'executed the task.',
  [ActionType.TASK_COMPLETED]: 'completed the task.',
  [ActionType.TASK_CANCELLED]: 'cancelled the task.',
  [ActionType.TASK_FAILED]: 'failed the task.',
  [ActionType.TASK_SKIPPED]: 'skipped the task.',
  [ActionType.TASK_PAUSED]: 'paused the task.',
  [ActionType.BLOCK_EXECUTED]: 'executed a block in the task.',
}

type ValueBadgeProps = {
  property: string
  value: string
  variant: 'Old' | 'New'
}

const propertyLabelMap: Record<string, Record<string, string>> = {
  record: taskStatusLabel,
  stage: taskStatusLabel,
}

function ValueBadge({ property, value, variant }: ValueBadgeProps): React.JSX.Element {
  const text = React.useMemo(() => {
    if (!value) {
      return 'Empty'
    }
    return propertyLabelMap[property]?.[value] || value
  }, [property, value])

  const isEmpty = !value

  return (
    <Badge
      className={cn(
        'block w-full truncate font-normal',
        variant === 'Old' && 'line-through',
        isEmpty && 'border-neutral-300 text-muted-foreground opacity-65 dark:border-neutral-700'
      )}
      variant={isEmpty ? 'secondary' : 'outline'}
      title={text}
    >
      {text}
    </Badge>
  )
}
