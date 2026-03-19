import React, { useState } from 'react'
import { useColors } from '../../theme'
import { usePmStore } from '../../stores/pmStore'
import type { Project } from '../../../shared/pm-types'
import { GitHubSettings } from './GitHubSettings'

interface Props {
  project: Project
  onClose: () => void
}

export function ProjectSettings({ project, onClose }: Props) {
  const colors = useColors()
  const updateProject = usePmStore((s) => s.updateProject)
  const deleteProject = usePmStore((s) => s.deleteProject)
  const syncProject = usePmStore((s) => s.syncProject)
  const syncProgress = usePmStore((s) => s.syncProgress)

  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description ?? '')
  const [githubOwner, setGithubOwner] = useState(project.githubOwner ?? '')
  const [githubRepo, setGithubRepo] = useState(project.githubRepo ?? '')
  const [saving, setSaving] = useState(false)

  const fieldStyle = {
    background: colors.surfacePrimary,
    border: `1px solid ${colors.inputBorder}`,
    borderRadius: 8,
    padding: '7px 10px',
    fontSize: 12,
    color: colors.textPrimary,
    outline: 'none',
    width: '100%',
    fontFamily: 'inherit',
  }

  const labelStyle = {
    fontSize: 11,
    fontWeight: 500,
    color: colors.textTertiary,
    marginBottom: 4,
    display: 'block',
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await updateProject(project.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        githubOwner: githubOwner.trim() || undefined,
        githubRepo: githubRepo.trim() || undefined,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete project "${project.name}" and all its issues?`)) return
    await deleteProject(project.id)
    onClose()
  }

  const handleSync = async () => {
    await syncProject(project.id)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between flex-shrink-0"
        style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.containerBorder}` }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>Project Settings</span>
        <button
          onClick={onClose}
          style={{ fontSize: 11, color: colors.textTertiary, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Done
        </button>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ padding: 16 }}>
        {/* Name */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Project Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={fieldStyle}
            onFocus={(e) => { (e.target as HTMLElement).style.borderColor = colors.inputFocusBorder }}
            onBlur={(e) => { (e.target as HTMLElement).style.borderColor = colors.inputBorder }}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            style={{ ...fieldStyle, resize: 'none' }}
            onFocus={(e) => { (e.target as HTMLElement).style.borderColor = colors.inputFocusBorder }}
            onBlur={(e) => { (e.target as HTMLElement).style.borderColor = colors.inputBorder }}
          />
        </div>

        {/* GitHub repo */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>GitHub Repository</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={githubOwner}
              onChange={(e) => setGithubOwner(e.target.value)}
              placeholder="owner"
              style={{ ...fieldStyle, flex: 1 }}
              onFocus={(e) => { (e.target as HTMLElement).style.borderColor = colors.inputFocusBorder }}
              onBlur={(e) => { (e.target as HTMLElement).style.borderColor = colors.inputBorder }}
            />
            <span style={{ display: 'flex', alignItems: 'center', color: colors.textTertiary, fontSize: 14 }}>/</span>
            <input
              type="text"
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              placeholder="repo"
              style={{ ...fieldStyle, flex: 1 }}
              onFocus={(e) => { (e.target as HTMLElement).style.borderColor = colors.inputFocusBorder }}
              onBlur={(e) => { (e.target as HTMLElement).style.borderColor = colors.inputBorder }}
            />
          </div>
        </div>

        {/* Save */}
        <div className="flex gap-2" style={{ marginBottom: 20 }}>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            style={{
              flex: 1,
              background: name.trim() ? colors.accent : colors.btnDisabled,
              border: 'none',
              borderRadius: 8,
              padding: '7px',
              fontSize: 12,
              color: name.trim() ? '#fff' : colors.textTertiary,
              cursor: name.trim() ? 'pointer' : 'default',
              fontWeight: 500,
            }}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        <hr style={{ border: 'none', borderTop: `1px solid ${colors.containerBorder}`, marginBottom: 16 }} />

        {/* GitHub settings */}
        <GitHubSettings githubOwner={project.githubOwner} githubRepo={project.githubRepo} />

        {/* Sync */}
        {project.githubOwner && project.githubRepo && (
          <div style={{ padding: '0 0 12px' }}>
            <button
              onClick={handleSync}
              disabled={syncProgress !== null}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.containerBorder}`,
                borderRadius: 8,
                padding: '6px 14px',
                fontSize: 12,
                color: colors.textSecondary,
                cursor: syncProgress ? 'default' : 'pointer',
              }}
            >
              {syncProgress ? `${syncProgress.message}` : 'Sync with GitHub'}
            </button>
          </div>
        )}

        <hr style={{ border: 'none', borderTop: `1px solid ${colors.containerBorder}`, marginBottom: 16 }} />

        {/* Danger zone */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: colors.statusError, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Danger Zone
          </p>
          <button
            onClick={handleDelete}
            style={{
              background: 'transparent',
              border: `1px solid ${colors.statusError}44`,
              borderRadius: 8,
              padding: '6px 14px',
              fontSize: 12,
              color: colors.statusError,
              cursor: 'pointer',
            }}
          >
            Delete Project
          </button>
        </div>
      </div>
    </div>
  )
}
