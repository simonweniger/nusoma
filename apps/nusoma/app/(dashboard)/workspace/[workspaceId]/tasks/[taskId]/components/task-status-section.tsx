'use client'

import * as React from 'react'
import { TaskStatus } from '@nusoma/database/schema'
import { Button } from '@nusoma/design-system/components/ui/button'
import { toast } from '@nusoma/design-system/components/ui/sonner'
import type { TaskDto } from '@nusoma/types/dtos/task-dto'
import { CircleCheckIcon } from 'lucide-react'
import { getStatusConfig } from '@/lib/task-status'

export type TaskStatusSectionProps = React.HtmlHTMLAttributes<HTMLDivElement> & {
  task: TaskDto
}

export function TaskStatusSection({ task, ...others }: TaskStatusSectionProps): React.JSX.Element {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const currentStatus = getStatusConfig(task.status)

  const handleRetrigger = async () => {
    if (!task.assigneeId) {
      toast.error('No worker assigned to this task.')
      return
    }
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}/execute`, {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('Worker execution has been re-triggered.')
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || "Couldn't re-trigger execution.")
      }
    } catch (_error) {
      toast.error('An unexpected error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const IconComponent = currentStatus?.icon

  return (
    <section {...others}>
      <div className='space-y-4 p-6'>
        <div className='flex flex-col items-start whitespace-nowrap'>
          <dt className='flex h-7 min-w-24 flex-row items-center gap-2 text-muted-foreground text-sm'>
            <CircleCheckIcon className='size-3 shrink-0' />
            Status
          </dt>
          <div className='flex min-h-[36px] items-center gap-2'>
            {IconComponent && <IconComponent />}
            <span className='font-medium text-sm'>{currentStatus?.name ?? task.status}</span>
          </div>
        </div>

        {task.status === TaskStatus.HUMAN_NEEDED && (
          <Button
            onClick={handleRetrigger}
            disabled={isSubmitting || !task.assigneeId}
            variant='outline'
            className='w-full'
          >
            {isSubmitting ? 'Requesting...' : 'Ask for Revision'}
          </Button>
        )}
      </div>
    </section>
  )
}
