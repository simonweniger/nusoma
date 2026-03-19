import React from 'react'
import { Folder, GitBranch } from '@phosphor-icons/react'
import { useColors } from '../../theme'

interface Props {
  type: 'no-projects' | 'no-issues'
  onAction?: () => void
}

export function EmptyState({ type, onAction }: Props) {
  const colors = useColors()

  if (type === 'no-projects') {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-3"
        style={{ color: colors.textTertiary, padding: 32 }}
      >
        <Folder size={36} style={{ opacity: 0.4 }} />
        <div className="text-center">
          <p style={{ fontSize: 13, fontWeight: 500, color: colors.textSecondary, marginBottom: 4 }}>No projects yet</p>
          <p style={{ fontSize: 12 }}>Create a project to start tracking issues</p>
        </div>
        {onAction && (
          <button
            onClick={onAction}
            style={{
              marginTop: 4,
              background: colors.accent,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '6px 16px',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            New Project
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-3"
      style={{ color: colors.textTertiary, padding: 32 }}
    >
      <GitBranch size={36} style={{ opacity: 0.4 }} />
      <div className="text-center">
        <p style={{ fontSize: 13, fontWeight: 500, color: colors.textSecondary, marginBottom: 4 }}>No issues yet</p>
        <p style={{ fontSize: 12 }}>Create an issue or sync from GitHub</p>
      </div>
      {onAction && (
        <button
          onClick={onAction}
          style={{
            marginTop: 4,
            background: colors.accent,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '6px 16px',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          New Issue
        </button>
      )}
    </div>
  )
}
