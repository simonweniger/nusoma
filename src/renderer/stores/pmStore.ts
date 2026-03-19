import { create } from 'zustand'
import type { Project, Issue, Label, CreateProjectInput, CreateIssueInput, IssueFilters, SyncProgress, SyncResult } from '../../shared/pm-types'

interface PmState {
  // ─── UI state ───
  pmOpen: boolean
  activeProjectId: string | null
  activeIssueId: string | null

  // ─── Data ───
  projects: Project[]
  issuesByProject: Record<string, Issue[]>
  labelsByProject: Record<string, Label[]>

  // ─── Loading / error ───
  projectsLoading: boolean
  issuesLoading: boolean
  syncProgress: SyncProgress | null
  lastSyncResult: SyncResult | null
  error: string | null

  // ─── Search/filter ───
  issueSearch: string

  // ─── Actions ───
  openPm(): void
  closePm(): void
  setActiveProject(id: string | null): void
  setActiveIssue(id: string | null): void
  setIssueSearch(q: string): void

  loadProjects(): Promise<void>
  loadIssues(projectId: string, filters?: IssueFilters): Promise<void>
  loadLabels(projectId: string): Promise<void>

  createProject(data: CreateProjectInput): Promise<Project>
  updateProject(id: string, data: Partial<CreateProjectInput>): Promise<void>
  deleteProject(id: string): Promise<void>

  createIssue(data: CreateIssueInput): Promise<Issue>
  updateIssue(id: string, data: Partial<Issue>): Promise<void>
  deleteIssue(id: string): Promise<void>

  syncProject(projectId: string): Promise<SyncResult>
  setSyncProgress(p: SyncProgress | null): void
}

export const usePmStore = create<PmState>((set, get) => ({
  pmOpen: false,
  activeProjectId: null,
  activeIssueId: null,
  projects: [],
  issuesByProject: {},
  labelsByProject: {},
  projectsLoading: false,
  issuesLoading: false,
  syncProgress: null,
  lastSyncResult: null,
  error: null,
  issueSearch: '',

  openPm() {
    set({ pmOpen: true })
    // Load projects on first open
    if (get().projects.length === 0) {
      get().loadProjects()
    }
  },

  closePm() {
    set({ pmOpen: false })
  },

  setActiveProject(id) {
    set({ activeProjectId: id, activeIssueId: null })
    if (id) {
      get().loadIssues(id)
      get().loadLabels(id)
    }
  },

  setActiveIssue(id) {
    set({ activeIssueId: id })
  },

  setIssueSearch(q) {
    set({ issueSearch: q })
  },

  async loadProjects() {
    set({ projectsLoading: true, error: null })
    try {
      const projects = await window.nusoma.pm.listProjects()
      set({ projects, projectsLoading: false })
      // Auto-select first project if none selected
      if (!get().activeProjectId && projects.length > 0) {
        get().setActiveProject(projects[0].id)
      }
    } catch (err) {
      set({ projectsLoading: false, error: String(err) })
    }
  },

  async loadIssues(projectId, filters) {
    set({ issuesLoading: true })
    try {
      const issues = await window.nusoma.pm.listIssues(projectId, filters)
      set((s) => ({ issuesByProject: { ...s.issuesByProject, [projectId]: issues }, issuesLoading: false }))
    } catch (err) {
      set({ issuesLoading: false, error: String(err) })
    }
  },

  async loadLabels(projectId) {
    try {
      const labels = await window.nusoma.pm.listLabels(projectId)
      set((s) => ({ labelsByProject: { ...s.labelsByProject, [projectId]: labels } }))
    } catch {}
  },

  async createProject(data) {
    const project = await window.nusoma.pm.createProject(data)
    set((s) => ({ projects: [...s.projects, project] }))
    get().setActiveProject(project.id)
    return project
  },

  async updateProject(id, data) {
    const updated = await window.nusoma.pm.updateProject(id, data)
    set((s) => ({ projects: s.projects.map((p) => (p.id === id ? updated : p)) }))
  },

  async deleteProject(id) {
    await window.nusoma.pm.deleteProject(id)
    set((s) => {
      const projects = s.projects.filter((p) => p.id !== id)
      const next = projects[0]?.id ?? null
      return { projects, activeProjectId: s.activeProjectId === id ? next : s.activeProjectId }
    })
    if (get().activeProjectId) {
      get().loadIssues(get().activeProjectId!)
    }
  },

  async createIssue(data) {
    const issue = await window.nusoma.pm.createIssue(data)
    set((s) => ({
      issuesByProject: {
        ...s.issuesByProject,
        [data.projectId]: [issue, ...(s.issuesByProject[data.projectId] ?? [])],
      },
    }))
    return issue
  },

  async updateIssue(id, data) {
    const updated = await window.nusoma.pm.updateIssue(id, data)
    const pid = updated.projectId
    set((s) => ({
      issuesByProject: {
        ...s.issuesByProject,
        [pid]: (s.issuesByProject[pid] ?? []).map((i) => (i.id === id ? updated : i)),
      },
    }))
  },

  async deleteIssue(id) {
    const all = Object.values(get().issuesByProject).flat()
    const issue = all.find((i) => i.id === id)
    await window.nusoma.pm.deleteIssue(id)
    if (issue) {
      set((s) => ({
        issuesByProject: {
          ...s.issuesByProject,
          [issue.projectId]: (s.issuesByProject[issue.projectId] ?? []).filter((i) => i.id !== id),
        },
        activeIssueId: s.activeIssueId === id ? null : s.activeIssueId,
      }))
    }
  },

  async syncProject(projectId) {
    set({ syncProgress: { phase: 'fetching', current: 0, total: 0, message: 'Starting sync…' } })
    try {
      const result = await window.nusoma.pm.syncProject(projectId)
      set({ syncProgress: null, lastSyncResult: result })
      // Reload issues after sync
      await get().loadIssues(projectId)
      return result
    } catch (err) {
      set({ syncProgress: null, error: String(err) })
      return { created: 0, updated: 0, pushed: 0, errors: [String(err)] }
    }
  },

  setSyncProgress(p) {
    set({ syncProgress: p })
  },
}))
