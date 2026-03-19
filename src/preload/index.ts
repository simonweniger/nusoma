import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/types'
import type { RunOptions, NormalizedEvent, HealthReport, EnrichedError, Attachment, SessionMeta, CatalogPlugin, SessionLoadMessage, ShortcutSettings, ShortcutSettingsUpdateResult } from '../shared/types'
import type { Project, Issue, Label, CreateProjectInput, CreateIssueInput, IssueFilters, SyncResult, SyncProgress } from '../shared/pm-types'

export interface CluiAPI {
  // ─── Request-response (renderer → main) ───
  start(): Promise<{ version: string; auth: { email?: string; subscriptionType?: string; authMethod?: string }; mcpServers: string[]; projectPath: string; homePath: string }>
  createTab(): Promise<{ tabId: string }>
  prompt(tabId: string, requestId: string, options: RunOptions): Promise<void>
  cancel(requestId: string): Promise<boolean>
  stopTab(tabId: string): Promise<boolean>
  retry(tabId: string, requestId: string, options: RunOptions): Promise<void>
  status(): Promise<HealthReport>
  tabHealth(): Promise<HealthReport>
  closeTab(tabId: string): Promise<void>
  selectDirectory(): Promise<string | null>
  openExternal(url: string): Promise<boolean>
  openInTerminal(sessionId: string | null, projectPath?: string): Promise<boolean>
  attachFiles(): Promise<Attachment[] | null>
  takeScreenshot(): Promise<Attachment | null>
  pasteImage(dataUrl: string): Promise<Attachment | null>
  transcribeAudio(audioBase64: string): Promise<{ error: string | null; transcript: string | null }>
  getDiagnostics(): Promise<any>
  respondPermission(tabId: string, questionId: string, optionId: string): Promise<boolean>
  initSession(tabId: string): void
  resetTabSession(tabId: string): void
  listSessions(projectPath?: string): Promise<SessionMeta[]>
  loadSession(sessionId: string, projectPath?: string): Promise<SessionLoadMessage[]>
  fetchMarketplace(forceRefresh?: boolean): Promise<{ plugins: CatalogPlugin[]; error: string | null }>
  listInstalledPlugins(): Promise<string[]>
  installPlugin(repo: string, pluginName: string, marketplace: string, sourcePath?: string, isSkillMd?: boolean): Promise<{ ok: boolean; error?: string }>
  uninstallPlugin(pluginName: string): Promise<{ ok: boolean; error?: string }>
  setPermissionMode(mode: string): void
  getTheme(): Promise<{ isDark: boolean }>
  onThemeChange(callback: (isDark: boolean) => void): () => void
  getShortcutSettings(): Promise<ShortcutSettings>
  setShortcutSettings(settings: ShortcutSettings): Promise<ShortcutSettingsUpdateResult>

  // ─── Project Management ───
  pm: {
    listProjects(): Promise<Project[]>
    createProject(data: CreateProjectInput): Promise<Project>
    updateProject(id: string, data: Partial<CreateProjectInput>): Promise<Project>
    deleteProject(id: string): Promise<void>
    listIssues(projectId: string, filters?: IssueFilters): Promise<Issue[]>
    getIssue(id: string): Promise<Issue | null>
    createIssue(data: CreateIssueInput): Promise<Issue>
    updateIssue(id: string, data: Partial<Issue>): Promise<Issue>
    deleteIssue(id: string): Promise<void>
    listLabels(projectId: string): Promise<Label[]>
    createLabel(projectId: string, name: string, color: string): Promise<Label>
    deleteLabel(id: string): Promise<void>
    setGitHubToken(token: string): Promise<void>
    hasGitHubToken(): Promise<boolean>
    syncProject(projectId: string): Promise<SyncResult>
    testGitHubConnection(owner: string, repo: string): Promise<{ ok: boolean; error?: string }>
    onSyncProgress(cb: (progress: SyncProgress) => void): () => void
  }

  // ─── Window management ───
  resizeHeight(height: number): void
  setWindowWidth(width: number): void
  animateHeight(from: number, to: number, durationMs: number): Promise<void>
  hideWindow(): void
  isVisible(): Promise<boolean>
  /** OS-level click-through for transparent window regions */
  setIgnoreMouseEvents(ignore: boolean, options?: { forward?: boolean }): void
  /** Manual window drag for frameless windows */
  startWindowDrag(deltaX: number, deltaY: number): void

  // ─── Event listeners (main → renderer) ───
  onEvent(callback: (tabId: string, event: NormalizedEvent) => void): () => void
  onTabStatusChange(callback: (tabId: string, newStatus: string, oldStatus: string) => void): () => void
  onError(callback: (tabId: string, error: EnrichedError) => void): () => void
  onSkillStatus(callback: (status: { name: string; state: string; error?: string; reason?: string }) => void): () => void
  onWindowShown(callback: () => void): () => void
}

const api: CluiAPI = {
  // ─── Request-response ───
  start: () => ipcRenderer.invoke(IPC.START),
  createTab: () => ipcRenderer.invoke(IPC.CREATE_TAB),
  prompt: (tabId, requestId, options) => ipcRenderer.invoke(IPC.PROMPT, { tabId, requestId, options }),
  cancel: (requestId) => ipcRenderer.invoke(IPC.CANCEL, requestId),
  stopTab: (tabId) => ipcRenderer.invoke(IPC.STOP_TAB, tabId),
  retry: (tabId, requestId, options) => ipcRenderer.invoke(IPC.RETRY, { tabId, requestId, options }),
  status: () => ipcRenderer.invoke(IPC.STATUS),
  tabHealth: () => ipcRenderer.invoke(IPC.TAB_HEALTH),
  closeTab: (tabId) => ipcRenderer.invoke(IPC.CLOSE_TAB, tabId),
  selectDirectory: () => ipcRenderer.invoke(IPC.SELECT_DIRECTORY),
  openExternal: (url) => ipcRenderer.invoke(IPC.OPEN_EXTERNAL, url),
  openInTerminal: (sessionId, projectPath) => ipcRenderer.invoke(IPC.OPEN_IN_TERMINAL, { sessionId, projectPath }),
  attachFiles: () => ipcRenderer.invoke(IPC.ATTACH_FILES),
  takeScreenshot: () => ipcRenderer.invoke(IPC.TAKE_SCREENSHOT),
  pasteImage: (dataUrl) => ipcRenderer.invoke(IPC.PASTE_IMAGE, dataUrl),
  transcribeAudio: (audioBase64) => ipcRenderer.invoke(IPC.TRANSCRIBE_AUDIO, audioBase64),
  getDiagnostics: () => ipcRenderer.invoke(IPC.GET_DIAGNOSTICS),
  respondPermission: (tabId, questionId, optionId) =>
    ipcRenderer.invoke(IPC.RESPOND_PERMISSION, { tabId, questionId, optionId }),
  initSession: (tabId) => ipcRenderer.send(IPC.INIT_SESSION, tabId),
  resetTabSession: (tabId) => ipcRenderer.send(IPC.RESET_TAB_SESSION, tabId),
  listSessions: (projectPath?: string) => ipcRenderer.invoke(IPC.LIST_SESSIONS, projectPath),
  loadSession: (sessionId: string, projectPath?: string) => ipcRenderer.invoke(IPC.LOAD_SESSION, { sessionId, projectPath }),
  fetchMarketplace: (forceRefresh) => ipcRenderer.invoke(IPC.MARKETPLACE_FETCH, { forceRefresh }),
  listInstalledPlugins: () => ipcRenderer.invoke(IPC.MARKETPLACE_INSTALLED),
  installPlugin: (repo, pluginName, marketplace, sourcePath, isSkillMd) =>
    ipcRenderer.invoke(IPC.MARKETPLACE_INSTALL, { repo, pluginName, marketplace, sourcePath, isSkillMd }),
  uninstallPlugin: (pluginName) =>
    ipcRenderer.invoke(IPC.MARKETPLACE_UNINSTALL, { pluginName }),
  setPermissionMode: (mode) => ipcRenderer.send(IPC.SET_PERMISSION_MODE, mode),
  getTheme: () => ipcRenderer.invoke(IPC.GET_THEME),
  getShortcutSettings: () => ipcRenderer.invoke(IPC.GET_SHORTCUT_SETTINGS),
  setShortcutSettings: (settings) => ipcRenderer.invoke(IPC.SET_SHORTCUT_SETTINGS, settings),
  onThemeChange: (callback) => {
    const handler = (_e: Electron.IpcRendererEvent, isDark: boolean) => callback(isDark)
    ipcRenderer.on(IPC.THEME_CHANGED, handler)
    return () => ipcRenderer.removeListener(IPC.THEME_CHANGED, handler)
  },

  // ─── Window management ───
  resizeHeight: (height) => ipcRenderer.send(IPC.RESIZE_HEIGHT, height),
  animateHeight: (from, to, durationMs) =>
    ipcRenderer.invoke(IPC.ANIMATE_HEIGHT, { from, to, durationMs }),
  hideWindow: () => ipcRenderer.send(IPC.HIDE_WINDOW),
  isVisible: () => ipcRenderer.invoke(IPC.IS_VISIBLE),
  setIgnoreMouseEvents: (ignore, options) =>
    ipcRenderer.send(IPC.SET_IGNORE_MOUSE_EVENTS, ignore, options || {}),
  startWindowDrag: (deltaX, deltaY) =>
    ipcRenderer.send(IPC.START_WINDOW_DRAG, deltaX, deltaY),
  setWindowWidth: (width) => ipcRenderer.send(IPC.SET_WINDOW_WIDTH, width),

  // ─── Event listeners ───
  onEvent: (callback) => {
    const channels = [
      IPC.TEXT_CHUNK, IPC.TOOL_CALL, IPC.TOOL_CALL_UPDATE,
      IPC.TOOL_CALL_COMPLETE, IPC.TASK_UPDATE, IPC.TASK_COMPLETE,
      IPC.SESSION_DEAD, IPC.SESSION_INIT, IPC.ERROR, IPC.RATE_LIMIT,
    ]
    // Single unified handler — all normalized events come through one channel
    const handler = (_e: Electron.IpcRendererEvent, tabId: string, event: NormalizedEvent) => callback(tabId, event)
    ipcRenderer.on('nusoma:normalized-event', handler)
    return () => ipcRenderer.removeListener('nusoma:normalized-event', handler)
  },

  onTabStatusChange: (callback) => {
    const handler = (_e: Electron.IpcRendererEvent, tabId: string, newStatus: string, oldStatus: string) =>
      callback(tabId, newStatus, oldStatus)
    ipcRenderer.on('nusoma:tab-status-change', handler)
    return () => ipcRenderer.removeListener('nusoma:tab-status-change', handler)
  },

  onError: (callback) => {
    const handler = (_e: Electron.IpcRendererEvent, tabId: string, error: EnrichedError) =>
      callback(tabId, error)
    ipcRenderer.on('nusoma:enriched-error', handler)
    return () => ipcRenderer.removeListener('nusoma:enriched-error', handler)
  },

  onSkillStatus: (callback) => {
    const handler = (_e: Electron.IpcRendererEvent, status: any) => callback(status)
    ipcRenderer.on(IPC.SKILL_STATUS, handler)
    return () => ipcRenderer.removeListener(IPC.SKILL_STATUS, handler)
  },

  onWindowShown: (callback) => {
    const handler = () => callback()
    ipcRenderer.on(IPC.WINDOW_SHOWN, handler)
    return () => ipcRenderer.removeListener(IPC.WINDOW_SHOWN, handler)
  },

  // ─── Project Management ───
  pm: {
    listProjects: () => ipcRenderer.invoke(IPC.PM_LIST_PROJECTS),
    createProject: (data) => ipcRenderer.invoke(IPC.PM_CREATE_PROJECT, data),
    updateProject: (id, data) => ipcRenderer.invoke(IPC.PM_UPDATE_PROJECT, { id, data }),
    deleteProject: (id) => ipcRenderer.invoke(IPC.PM_DELETE_PROJECT, id),
    listIssues: (projectId, filters) => ipcRenderer.invoke(IPC.PM_LIST_ISSUES, { projectId, filters }),
    getIssue: (id) => ipcRenderer.invoke(IPC.PM_GET_ISSUE, id),
    createIssue: (data) => ipcRenderer.invoke(IPC.PM_CREATE_ISSUE, data),
    updateIssue: (id, data) => ipcRenderer.invoke(IPC.PM_UPDATE_ISSUE, { id, data }),
    deleteIssue: (id) => ipcRenderer.invoke(IPC.PM_DELETE_ISSUE, id),
    listLabels: (projectId) => ipcRenderer.invoke(IPC.PM_LIST_LABELS, projectId),
    createLabel: (projectId, name, color) => ipcRenderer.invoke(IPC.PM_CREATE_LABEL, { projectId, name, color }),
    deleteLabel: (id) => ipcRenderer.invoke(IPC.PM_DELETE_LABEL, id),
    setGitHubToken: (token) => ipcRenderer.invoke(IPC.PM_SET_GITHUB_TOKEN, token),
    hasGitHubToken: () => ipcRenderer.invoke(IPC.PM_HAS_GITHUB_TOKEN),
    syncProject: (projectId) => ipcRenderer.invoke(IPC.PM_SYNC_PROJECT, projectId),
    testGitHubConnection: (owner, repo) => ipcRenderer.invoke(IPC.PM_TEST_GITHUB, { owner, repo }),
    onSyncProgress: (cb) => {
      const handler = (_e: Electron.IpcRendererEvent, progress: SyncProgress) => cb(progress)
      ipcRenderer.on(IPC.PM_SYNC_PROGRESS, handler)
      return () => ipcRenderer.removeListener(IPC.PM_SYNC_PROGRESS, handler)
    },
  },
}

contextBridge.exposeInMainWorld('nusoma', api)
