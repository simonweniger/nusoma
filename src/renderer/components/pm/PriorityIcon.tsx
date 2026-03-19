import React from 'react'
import { ArrowUp, ArrowRight, ArrowDown, Warning, Minus } from '@phosphor-icons/react'
import type { IssuePriority } from '../../../shared/pm-types'

const PRIORITY_CONFIG: Record<IssuePriority, { Icon: React.ComponentType<{ size?: number }>; color: string; title: string }> = {
  urgent: { Icon: Warning, color: '#c47060', title: 'Urgent' },
  high: { Icon: ArrowUp, color: '#d97757', title: 'High' },
  medium: { Icon: ArrowRight, color: '#8a8a80', title: 'Medium' },
  low: { Icon: ArrowDown, color: '#6b6b60', title: 'Low' },
  none: { Icon: Minus, color: '#4a4a45', title: 'No priority' },
}

interface Props {
  priority: IssuePriority
  size?: number
}

export function PriorityIcon({ priority, size = 13 }: Props) {
  const cfg = PRIORITY_CONFIG[priority]
  return (
    <span style={{ color: cfg.color, display: 'inline-flex', alignItems: 'center' }} title={cfg.title}>
      <cfg.Icon size={size} />
    </span>
  )
}
