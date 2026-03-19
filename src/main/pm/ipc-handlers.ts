import { ipcMain, BrowserWindow } from 'electron'
import { IPC } from '../../shared/types'
import {
  listProjects, getProject, createProject, updateProject, deleteProject,
} from './projects'
import {
  listIssues, getIssue, createIssue, updateIssue, deleteIssue,
  listLabels, createLabel, deleteLabel,
} from './issues'
import {
  setGitHubToken, hasGitHubToken, testGitHubConnection, syncProject,
} from './github'
import type { CreateProjectInput, CreateIssueInput, IssueFilters, Issue } from '../../shared/pm-types'

export function registerPmHandlers(): void {
  // ─── Projects ───
  ipcMain.handle(IPC.PM_LIST_PROJECTS, () => listProjects())

  ipcMain.handle(IPC.PM_CREATE_PROJECT, (_e, data: CreateProjectInput) => createProject(data))

  ipcMain.handle(IPC.PM_UPDATE_PROJECT, (_e, { id, data }: { id: string; data: Partial<CreateProjectInput> }) =>
    updateProject(id, data))

  ipcMain.handle(IPC.PM_DELETE_PROJECT, (_e, id: string) => deleteProject(id))

  // ─── Issues ───
  ipcMain.handle(IPC.PM_LIST_ISSUES, (_e, { projectId, filters }: { projectId: string; filters?: IssueFilters }) =>
    listIssues(projectId, filters))

  ipcMain.handle(IPC.PM_GET_ISSUE, (_e, id: string) => getIssue(id))

  ipcMain.handle(IPC.PM_CREATE_ISSUE, (_e, data: CreateIssueInput) => createIssue(data))

  ipcMain.handle(IPC.PM_UPDATE_ISSUE, (_e, { id, data }: { id: string; data: Partial<Issue> }) =>
    updateIssue(id, data))

  ipcMain.handle(IPC.PM_DELETE_ISSUE, (_e, id: string) => deleteIssue(id))

  // ─── Labels ───
  ipcMain.handle(IPC.PM_LIST_LABELS, (_e, projectId: string) => listLabels(projectId))

  ipcMain.handle(IPC.PM_CREATE_LABEL, (_e, { projectId, name, color }: { projectId: string; name: string; color: string }) =>
    createLabel(projectId, name, color))

  ipcMain.handle(IPC.PM_DELETE_LABEL, (_e, id: string) => deleteLabel(id))

  // ─── GitHub ───
  ipcMain.handle(IPC.PM_SET_GITHUB_TOKEN, (_e, token: string) => setGitHubToken(token))

  ipcMain.handle(IPC.PM_HAS_GITHUB_TOKEN, () => hasGitHubToken())

  ipcMain.handle(IPC.PM_TEST_GITHUB, (_e, { owner, repo }: { owner: string; repo: string }) =>
    testGitHubConnection(owner, repo))

  ipcMain.handle(IPC.PM_SYNC_PROJECT, async (event, projectId: string) => {
    const project = getProject(projectId)
    if (!project) return { created: 0, updated: 0, pushed: 0, errors: ['Project not found'] }

    return syncProject(project, (progress) => {
      // Broadcast progress to all windows
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) {
          win.webContents.send(IPC.PM_SYNC_PROGRESS, progress)
        }
      }
    })
  })
}
