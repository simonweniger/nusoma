'use client'

import type { TaskStatus } from '@nusoma/database/schema'
import { cn } from '@nusoma/design-system/lib/utils'
import { statusConfig } from '@/lib/task-status'

interface StatusLabelProps {
  status: TaskStatus
  displayMode?: 'iconOnly' | 'iconAndText'
  className?: string
}

export function StatusLabel({ status, displayMode = 'iconOnly', className }: StatusLabelProps) {
  const config = statusConfig[status]
  if (!config) {
    return null
  }
  const StatusIcon = config.icon

  if (displayMode === 'iconOnly') {
    return <StatusIcon />
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <StatusIcon />
      <span className='font-medium'>{config.name}</span>
    </div>
  )
}
