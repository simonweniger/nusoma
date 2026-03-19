import React, { useState } from 'react'
import { X } from '@phosphor-icons/react'
import type { Project } from '../../../shared/pm-types'
import { useColors } from '../../theme'
import { usePmStore } from '../../stores/pmStore'
import { usePmEvents } from '../../hooks/usePmEvents'
import { Sidebar } from './Sidebar'
import { IssueList } from './IssueList'
import { IssueDetail } from './IssueDetail'
import { CreateIssueModal } from './CreateIssueModal'
import { ProjectSettings } from './ProjectSettings'
import { SyncStatus } from './SyncStatus'
import { EmptyState } from './EmptyState'

export function PMPanel() {
  const colors = useColors()
  usePmEvents()

  const closePm = usePmStore((s) => s.closePm)
  const projects = usePmStore((s) => s.projects)
  const activeProjectId = usePmStore((s) => s.activeProjectId)
  const activeIssueId = usePmStore((s) => s.activeIssueId)
  const setActiveProject = usePmStore((s) => s.setActiveProject)
  const setActiveIssue = usePmStore((s) => s.setActiveIssue)
  const issuesByProject = usePmStore((s) => s.issuesByProject)
  const syncProject = usePmStore((s) => s.syncProject)
  const projectsLoading = usePmStore((s) => s.projectsLoading)

  const [showCreateIssue, setShowCreateIssue] = useState(false)
  const [settingsProject, setSettingsProject] = useState<Project | null>(null)

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null
  const issues = activeProjectId ? (issuesByProject[activeProjectId] ?? []) : []
  const activeIssue = issues.find((i) => i.id === activeIssueId) ?? null

  const handleSync = () => {
    if (activeProjectId) syncProject(activeProjectId)
  }

  // Determine right panel content
  const showSettings = settingsProject !== null
  const showDetail = !showSettings && activeIssue !== null
  const showSyncBar = activeProject?.githubOwner && activeProject?.githubRepo

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ height: 470 }}
    >
      {/* ─── Header ─── */}
      <div
        className="flex items-center justify-between flex-shrink-0"
        style={{
          padding: '10px 14px',
          borderBottom: `1px solid ${colors.containerBorder}`,
          background: colors.containerBgCollapsed,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>Projects</span>
        <button
          onClick={closePm}
          style={{ color: colors.textTertiary, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* ─── Body ─── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          projects={projects}
          activeProjectId={activeProjectId}
          onSelectProject={(id) => {
            setActiveProject(id)
            setSettingsProject(null)
            setActiveIssue(null)
          }}
          onOpenSettings={(project) => {
            setSettingsProject(project)
            setActiveIssue(null)
          }}
        />

        {/* Main content */}
        {projectsLoading && projects.length === 0 ? (
          <div className="flex-1 flex items-center justify-center" style={{ color: colors.textTertiary, fontSize: 12 }}>
            Loading…
          </div>
        ) : projects.length === 0 ? (
          <div className="flex-1">
            <EmptyState type="no-projects" />
          </div>
        ) : showSettings ? (
          <div className="flex-1 overflow-hidden">
            <ProjectSettings
              project={settingsProject!}
              onClose={() => setSettingsProject(null)}
            />
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* Issue list */}
            <div
              className="flex flex-col overflow-hidden"
              style={{ flex: showDetail ? '0 0 260px' : '1', minWidth: 0, borderRight: showDetail ? `1px solid ${colors.containerBorder}` : 'none' }}
            >
              <div className="flex-1 overflow-hidden">
                <IssueList
                  issues={issues}
                  onNewIssue={() => setShowCreateIssue(true)}
                />
              </div>
              {showSyncBar && (
                <SyncStatus onSync={handleSync} />
              )}
            </div>

            {/* Issue detail — slide in when active */}
            {showDetail && (
              <div className="flex-1 overflow-hidden">
                <IssueDetail
                  issue={activeIssue!}
                  onClose={() => setActiveIssue(null)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create issue modal */}
      {showCreateIssue && activeProjectId && (
        <CreateIssueModal
          projectId={activeProjectId}
          onClose={() => setShowCreateIssue(false)}
        />
      )}
    </div>
  )
}
