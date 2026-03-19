import React from 'react'
import { GithubLogo } from '@phosphor-icons/react'
import type { Issue } from '../../../shared/pm-types'
import { useColors } from '../../theme'
import { StatusBadge } from './StatusBadge'
import { PriorityIcon } from './PriorityIcon'
import { LabelChip } from './LabelChip'

interface Props {
  issue: Issue
  isActive: boolean
  onClick: () => void
}

export function IssueRow({ issue, isActive, onClick }: Props) {
  const colors = useColors()
  const issueLabels = issue.labels ?? []

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-2 cursor-pointer select-none transition-colors"
      style={{
        padding: '6px 12px',
        background: isActive ? colors.surfaceActive : 'transparent',
        borderRadius: 8,
        minHeight: 34,
      }}
      onMouseEnter={(e) => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = colors.surfaceHover
      }}
      onMouseLeave={(e) => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
    >
      {/* Priority */}
      <span className="flex-shrink-0">
        <PriorityIcon priority={issue.priority} />
      </span>

      {/* Issue number */}
      <span style={{ fontSize: 11, color: colors.textTertiary, flexShrink: 0, minWidth: 28 }}>
        #{issue.number}
      </span>

      {/* Title */}
      <span
        className="flex-1 truncate"
        style={{ fontSize: 12, color: colors.textPrimary, fontWeight: 400 }}
      >
        {issue.title}
      </span>

      {/* Labels */}
      {issueLabels.length > 0 && (
        <div className="flex items-center gap-1 flex-shrink-0">
          {issueLabels.slice(0, 2).map((l) => (
            <LabelChip key={l.id} label={l} />
          ))}
        </div>
      )}

      {/* GitHub link indicator */}
      {issue.githubIssueNumber != null && (
        <span style={{ color: colors.textTertiary, flexShrink: 0 }}>
          <GithubLogo size={11} />
        </span>
      )}

      {/* Status */}
      <span className="flex-shrink-0">
        <StatusBadge status={issue.status} small />
      </span>
    </div>
  )
}
