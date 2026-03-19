import React, { useState, useRef, useEffect } from 'react'
import { X } from '@phosphor-icons/react'
import type { IssueStatus, IssuePriority } from '../../../shared/pm-types'
import { useColors } from '../../theme'
import { usePmStore } from '../../stores/pmStore'

interface Props {
  projectId: string
  onClose: () => void
}

export function CreateIssueModal({ projectId, onClose }: Props) {
  const colors = useColors()
  const createIssue = usePmStore((s) => s.createIssue)

  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<IssueStatus>('todo')
  const [priority, setPriority] = useState<IssuePriority>('none')
  const [submitting, setSubmitting] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)
    try {
      await createIssue({ projectId, title: title.trim(), status, priority })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 100, background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        data-nusoma-ui
        style={{
          background: colors.containerBg,
          border: `1px solid ${colors.containerBorder}`,
          borderRadius: 16,
          width: 420,
          padding: 20,
          boxShadow: colors.containerShadow,
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>New Issue</span>
          <button
            onClick={onClose}
            style={{ color: colors.textTertiary, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Issue title"
            style={{
              width: '100%',
              background: colors.surfacePrimary,
              border: `1px solid ${colors.inputBorder}`,
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 13,
              color: colors.textPrimary,
              outline: 'none',
              marginBottom: 12,
              fontFamily: 'inherit',
            }}
            onFocus={(e) => { (e.target as HTMLElement).style.borderColor = colors.inputFocusBorder }}
            onBlur={(e) => { (e.target as HTMLElement).style.borderColor = colors.inputBorder }}
          />

          <div className="flex gap-2" style={{ marginBottom: 16 }}>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as IssueStatus)}
              style={{
                flex: 1,
                background: colors.surfacePrimary,
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: 8,
                padding: '7px 10px',
                fontSize: 12,
                color: colors.textSecondary,
                cursor: 'pointer',
              }}
            >
              <option value="todo">Todo</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as IssuePriority)}
              style={{
                flex: 1,
                background: colors.surfacePrimary,
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: 8,
                padding: '7px 10px',
                fontSize: 12,
                color: colors.textSecondary,
                cursor: 'pointer',
              }}
            >
              <option value="none">No priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.containerBorder}`,
                borderRadius: 8,
                padding: '6px 14px',
                fontSize: 12,
                color: colors.textSecondary,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || submitting}
              style={{
                background: title.trim() ? colors.accent : colors.btnDisabled,
                border: 'none',
                borderRadius: 8,
                padding: '6px 14px',
                fontSize: 12,
                color: title.trim() ? '#fff' : colors.textTertiary,
                cursor: title.trim() ? 'pointer' : 'default',
                fontWeight: 500,
              }}
            >
              {submitting ? 'Creating…' : 'Create Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
