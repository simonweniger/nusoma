import React, { useMemo } from 'react'
import type { Issue, IssueStatus } from '../../../shared/pm-types'
import { useColors } from '../../theme'
import { usePmStore } from '../../stores/pmStore'
import { IssueRow } from './IssueRow'
import { EmptyState } from './EmptyState'

const STATUS_ORDER: IssueStatus[] = ['in_progress', 'todo', 'done', 'cancelled']
const STATUS_LABELS: Record<IssueStatus, string> = {
  in_progress: 'In Progress',
  todo: 'Todo',
  done: 'Done',
  cancelled: 'Cancelled',
}

interface Props {
  issues: Issue[]
  onNewIssue: () => void
}

export function IssueList({ issues, onNewIssue }: Props) {
  const colors = useColors()
  const activeIssueId = usePmStore((s) => s.activeIssueId)
  const setActiveIssue = usePmStore((s) => s.setActiveIssue)
  const issueSearch = usePmStore((s) => s.issueSearch)
  const setIssueSearch = usePmStore((s) => s.setIssueSearch)
  const issuesLoading = usePmStore((s) => s.issuesLoading)

  const filtered = useMemo(() => {
    if (!issueSearch.trim()) return issues
    const q = issueSearch.toLowerCase()
    return issues.filter(
      (i) => i.title.toLowerCase().includes(q) || String(i.number).includes(q)
    )
  }, [issues, issueSearch])

  const grouped = useMemo(() => {
    const map: Partial<Record<IssueStatus, Issue[]>> = {}
    for (const issue of filtered) {
      if (!map[issue.status]) map[issue.status] = []
      map[issue.status]!.push(issue)
    }
    return map
  }, [filtered])

  if (issuesLoading && issues.length === 0) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: colors.textTertiary, fontSize: 12 }}>
        Loading…
      </div>
    )
  }

  if (issues.length === 0) {
    return <EmptyState type="no-issues" onAction={onNewIssue} />
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search bar */}
      <div style={{ padding: '8px 12px', borderBottom: `1px solid ${colors.containerBorder}` }}>
        <input
          type="text"
          value={issueSearch}
          onChange={(e) => setIssueSearch(e.target.value)}
          placeholder="Filter issues…"
          style={{
            width: '100%',
            background: colors.surfacePrimary,
            border: `1px solid ${colors.inputBorder}`,
            borderRadius: 8,
            padding: '5px 10px',
            fontSize: 12,
            color: colors.textPrimary,
            outline: 'none',
          }}
          onFocus={(e) => { (e.target as HTMLElement).style.borderColor = colors.inputFocusBorder }}
          onBlur={(e) => { (e.target as HTMLElement).style.borderColor = colors.inputBorder }}
        />
      </div>

      {/* Grouped issues */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none', padding: '6px 8px' }}>
        {STATUS_ORDER.map((status) => {
          const group = grouped[status]
          if (!group || group.length === 0) return null
          return (
            <div key={status} style={{ marginBottom: 8 }}>
              {/* Section header */}
              <div
                className="flex items-center gap-2"
                style={{ padding: '4px 4px 2px', marginBottom: 2 }}
              >
                <span style={{ fontSize: 11, fontWeight: 600, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {STATUS_LABELS[status]}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: colors.textTertiary,
                    background: colors.surfacePrimary,
                    borderRadius: 4,
                    padding: '0 5px',
                  }}
                >
                  {group.length}
                </span>
              </div>

              {/* Issue rows */}
              {group.map((issue) => (
                <IssueRow
                  key={issue.id}
                  issue={issue}
                  isActive={issue.id === activeIssueId}
                  onClick={() => setActiveIssue(issue.id === activeIssueId ? null : issue.id)}
                />
              ))}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="flex items-center justify-center" style={{ padding: 24, color: colors.textTertiary, fontSize: 12 }}>
            No matching issues
          </div>
        )}
      </div>

      {/* New issue button */}
      <div style={{ padding: '6px 12px', borderTop: `1px solid ${colors.containerBorder}` }}>
        <button
          onClick={onNewIssue}
          style={{
            width: '100%',
            background: 'transparent',
            border: `1px dashed ${colors.containerBorder}`,
            borderRadius: 8,
            padding: '5px 10px',
            fontSize: 12,
            color: colors.textTertiary,
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.borderColor = colors.accent
            el.style.color = colors.accent
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.borderColor = colors.containerBorder
            el.style.color = colors.textTertiary
          }}
        >
          + New Issue
        </button>
      </div>
    </div>
  )
}
