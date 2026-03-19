import React from 'react'
import type { IssueStatus } from '../../../shared/pm-types'

const STATUS_CONFIG: Record<IssueStatus, { label: string; bg: string; color: string }> = {
  todo: { label: 'Todo', bg: 'rgba(138, 138, 128, 0.15)', color: '#8a8a80' },
  in_progress: { label: 'In Progress', bg: 'rgba(217, 119, 87, 0.12)', color: '#d97757' },
  done: { label: 'Done', bg: 'rgba(122, 172, 140, 0.15)', color: '#7aac8c' },
  cancelled: { label: 'Cancelled', bg: 'rgba(138, 138, 128, 0.1)', color: '#6b6b60' },
}

interface Props {
  status: IssueStatus
  small?: boolean
}

export function StatusBadge({ status, small }: Props) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      style={{
        background: cfg.bg,
        color: cfg.color,
        borderRadius: 6,
        padding: small ? '1px 6px' : '2px 8px',
        fontSize: small ? 10 : 11,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        display: 'inline-block',
      }}
    >
      {cfg.label}
    </span>
  )
}
