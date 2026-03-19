import React, { useState } from 'react'
import { Plus, GearSix } from '@phosphor-icons/react'
import type { Project } from '../../../shared/pm-types'
import { useColors } from '../../theme'
import { usePmStore } from '../../stores/pmStore'

interface Props {
  projects: Project[]
  activeProjectId: string | null
  onSelectProject: (id: string) => void
  onOpenSettings: (project: Project) => void
}

export function Sidebar({ projects, activeProjectId, onSelectProject, onOpenSettings }: Props) {
  const colors = useColors()
  const createProject = usePmStore((s) => s.createProject)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    await createProject({ name: newName.trim() })
    setNewName('')
    setCreating(false)
  }

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        width: 180,
        flexShrink: 0,
        borderRight: `1px solid ${colors.containerBorder}`,
        background: colors.containerBgCollapsed,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between flex-shrink-0"
        style={{ padding: '12px 12px 8px' }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Projects
        </span>
        <button
          onClick={() => setCreating(true)}
          style={{ color: colors.textTertiary, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          title="New project"
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none', padding: '0 6px' }}>
        {projects.map((project) => {
          const isActive = project.id === activeProjectId
          return (
            <div
              key={project.id}
              className="group flex items-center justify-between cursor-pointer select-none"
              style={{
                padding: '6px 8px',
                borderRadius: 8,
                background: isActive ? colors.surfaceActive : 'transparent',
                marginBottom: 1,
              }}
              onClick={() => onSelectProject(project.id)}
              onMouseEnter={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = colors.surfaceHover
              }}
              onMouseLeave={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                {/* Project color dot */}
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: project.color ?? '#d97757',
                    flexShrink: 0,
                  }}
                />
                <span
                  className="truncate"
                  style={{
                    fontSize: 12,
                    color: isActive ? colors.textPrimary : colors.textSecondary,
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  {project.name}
                </span>
              </div>

              {/* Settings gear — shown on hover */}
              <button
                onClick={(e) => { e.stopPropagation(); onOpenSettings(project) }}
                className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                style={{ color: colors.textTertiary, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                title="Project settings"
              >
                <GearSix size={11} />
              </button>
            </div>
          )
        })}

        {/* Inline new project form */}
        {creating && (
          <form onSubmit={handleCreate} style={{ padding: '4px 4px' }}>
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => { if (!newName.trim()) setCreating(false) }}
              onKeyDown={(e) => { if (e.key === 'Escape') { setCreating(false); setNewName('') } }}
              placeholder="Project name…"
              style={{
                width: '100%',
                background: colors.surfacePrimary,
                border: `1px solid ${colors.inputFocusBorder}`,
                borderRadius: 8,
                padding: '5px 8px',
                fontSize: 12,
                color: colors.textPrimary,
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
          </form>
        )}
      </div>
    </div>
  )
}
