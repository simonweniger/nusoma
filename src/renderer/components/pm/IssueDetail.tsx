import React, { useState, useEffect, useRef } from 'react'
import { X, GithubLogo } from '@phosphor-icons/react'
import type { Issue, IssueStatus, IssuePriority } from '../../../shared/pm-types'
import { useColors } from '../../theme'
import { usePmStore } from '../../stores/pmStore'
import { PriorityIcon } from './PriorityIcon'

const STATUSES: IssueStatus[] = ['todo', 'in_progress', 'done', 'cancelled']
const PRIORITIES: IssuePriority[] = ['urgent', 'high', 'medium', 'low', 'none']
const PRIORITY_LABELS: Record<IssuePriority, string> = {
  urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low', none: 'None',
}

interface Props {
  issue: Issue
  onClose: () => void
}

export function IssueDetail({ issue, onClose }: Props) {
  const colors = useColors()
  const updateIssue = usePmStore((s) => s.updateIssue)
  const deleteIssue = usePmStore((s) => s.deleteIssue)

  const [title, setTitle] = useState(issue.title)
  const [description, setDescription] = useState(issue.description ?? '')
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset form when issue changes
  useEffect(() => {
    setTitle(issue.title)
    setDescription(issue.description ?? '')
  }, [issue.id])

  const scheduleSave = (updates: Partial<Issue>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      await updateIssue(issue.id, updates)
      setSaving(false)
    }, 600)
  }

  const handleTitleChange = (v: string) => {
    setTitle(v)
    if (v.trim()) scheduleSave({ title: v.trim() })
  }

  const handleDescriptionChange = (v: string) => {
    setDescription(v)
    scheduleSave({ description: v || null })
  }

  const handleStatusChange = (status: IssueStatus) => {
    updateIssue(issue.id, { status })
  }

  const handlePriorityChange = (priority: IssuePriority) => {
    updateIssue(issue.id, { priority })
  }

  const handleDelete = async () => {
    if (!confirm(`Delete issue #${issue.number}?`)) return
    await deleteIssue(issue.id)
    onClose()
  }

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ borderLeft: `1px solid ${colors.containerBorder}` }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between flex-shrink-0"
        style={{ padding: '10px 14px', borderBottom: `1px solid ${colors.containerBorder}` }}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 11, color: colors.textTertiary }}>#{issue.number}</span>
          {issue.githubIssueNumber != null && (
            <span style={{ color: colors.textTertiary }}>
              <GithubLogo size={12} />
            </span>
          )}
          {saving && <span style={{ fontSize: 10, color: colors.textTertiary }}>Saving…</span>}
        </div>
        <button
          onClick={onClose}
          style={{ color: colors.textTertiary, background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Metadata row */}
      <div
        className="flex items-center gap-3 flex-shrink-0"
        style={{ padding: '8px 14px', borderBottom: `1px solid ${colors.containerBorder}` }}
      >
        {/* Status selector */}
        <select
          value={issue.status}
          onChange={(e) => handleStatusChange(e.target.value as IssueStatus)}
          style={{
            background: colors.surfacePrimary,
            border: `1px solid ${colors.inputBorder}`,
            borderRadius: 6,
            padding: '3px 6px',
            fontSize: 11,
            color: colors.textSecondary,
            cursor: 'pointer',
          }}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>

        {/* Priority selector */}
        <select
          value={issue.priority}
          onChange={(e) => handlePriorityChange(e.target.value as IssuePriority)}
          style={{
            background: colors.surfacePrimary,
            border: `1px solid ${colors.inputBorder}`,
            borderRadius: 6,
            padding: '3px 6px',
            fontSize: 11,
            color: colors.textSecondary,
            cursor: 'pointer',
          }}
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
          ))}
        </select>

        <div className="flex-1" />

        <button
          onClick={handleDelete}
          style={{ fontSize: 11, color: colors.statusError, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          Delete
        </button>
      </div>

      {/* Title */}
      <div style={{ padding: '12px 14px 8px' }}>
        <textarea
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          rows={2}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontSize: 14,
            fontWeight: 600,
            color: colors.textPrimary,
            lineHeight: 1.4,
            fontFamily: 'inherit',
          }}
          placeholder="Issue title"
        />
      </div>

      {/* Description */}
      <div className="flex-1 overflow-hidden" style={{ padding: '0 14px 14px' }}>
        <textarea
          value={description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          style={{
            width: '100%',
            height: '100%',
            background: colors.surfacePrimary,
            border: `1px solid ${colors.inputBorder}`,
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 12,
            color: colors.textSecondary,
            outline: 'none',
            resize: 'none',
            fontFamily: 'inherit',
            lineHeight: 1.6,
          }}
          placeholder="Add a description (markdown supported)…"
          onFocus={(e) => { (e.target as HTMLElement).style.borderColor = colors.inputFocusBorder }}
          onBlur={(e) => { (e.target as HTMLElement).style.borderColor = colors.inputBorder }}
        />
      </div>
    </div>
  )
}
