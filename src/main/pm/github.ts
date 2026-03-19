import { safeStorage } from 'electron'
import { Octokit } from '@octokit/rest'
import { eq } from 'drizzle-orm'
import { getDb } from './db'
import { settings, issues } from './schema'
import { getIssue, updateIssue, createIssue, listIssues } from './issues'
import type { SyncProgress, SyncResult } from '../../shared/pm-types'
import type { Project } from '../../shared/pm-types'

const TOKEN_KEY = 'github_token_encrypted'

// ─── Token management ───

export function setGitHubToken(token: string): void {
  const db = getDb()
  if (!safeStorage.isEncryptionAvailable()) {
    db.insert(settings).values({ key: TOKEN_KEY, value: token })
      .onConflictDoUpdate({ target: settings.key, set: { value: token } })
      .run()
    return
  }
  const encrypted = safeStorage.encryptString(token).toString('base64')
  db.insert(settings).values({ key: TOKEN_KEY, value: encrypted })
    .onConflictDoUpdate({ target: settings.key, set: { value: encrypted } })
    .run()
}

export function getGitHubToken(): string | null {
  const db = getDb()
  const row = db.select().from(settings).where(eq(settings.key, TOKEN_KEY)).get()
  if (!row) return null
  if (!safeStorage.isEncryptionAvailable()) return row.value
  try {
    return safeStorage.decryptString(Buffer.from(row.value, 'base64'))
  } catch {
    return null
  }
}

export function hasGitHubToken(): boolean {
  return getGitHubToken() !== null
}

// ─── GitHub API helpers ───

function getOctokit(): Octokit {
  const token = getGitHubToken()
  return new Octokit({ auth: token ?? undefined })
}

export async function testGitHubConnection(owner: string, repo: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const octokit = getOctokit()
    await octokit.rest.repos.get({ owner, repo })
    return { ok: true }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ─── Sync logic ───

export async function syncProject(
  project: Project,
  onProgress: (p: SyncProgress) => void,
): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, pushed: 0, errors: [] }

  if (!project.githubOwner || !project.githubRepo) {
    return result
  }

  const owner = project.githubOwner
  const repo = project.githubRepo
  const octokit = getOctokit()

  // 1. Fetch all GH issues (open + recently closed)
  onProgress({ phase: 'fetching', current: 0, total: 0, message: 'Fetching GitHub issues…' })

  let ghIssues: Awaited<ReturnType<typeof octokit.rest.issues.listForRepo>>['data'] = []
  try {
    ghIssues = await octokit.paginate(octokit.rest.issues.listForRepo, {
      owner, repo,
      state: 'all',
      per_page: 100,
      // Only pull-requests have a pull_request field; filter them out below
    })
    // Exclude PRs (GitHub returns both issues and PRs from this endpoint)
    ghIssues = ghIssues.filter((i) => !i.pull_request)
  } catch (err: unknown) {
    result.errors.push(`Failed to fetch issues: ${err instanceof Error ? err.message : String(err)}`)
    onProgress({ phase: 'error', current: 0, total: 0, message: 'Failed to fetch GitHub issues' })
    return result
  }

  const total = ghIssues.length
  onProgress({ phase: 'processing', current: 0, total, message: `Processing ${total} issues…` })

  // 2. For each GH issue: upsert locally
  const localIssues = listIssues(project.id)
  const localByGhNumber = new Map(
    localIssues.filter((i) => i.githubIssueNumber != null)
      .map((i) => [i.githubIssueNumber!, i])
  )

  for (let i = 0; i < ghIssues.length; i++) {
    const gh = ghIssues[i]
    onProgress({ phase: 'processing', current: i + 1, total, message: `Processing #${gh.number}: ${gh.title}` })

    const normalizedLabels = gh.labels.map((l) => typeof l === 'string' ? { name: l } : l)
    const ghStatus = mapGhStatus({ state: gh.state, labels: normalizedLabels })
    const existing = localByGhNumber.get(gh.number)

    if (!existing) {
      // Create local issue
      try {
        createIssue({
          projectId: project.id,
          title: gh.title,
          description: gh.body ?? undefined,
          status: ghStatus,
        })
        result.created++
      } catch (err: unknown) {
        result.errors.push(`Create #${gh.number}: ${err instanceof Error ? err.message : String(err)}`)
      }
      // Update the just-created issue to store github_issue_number
      const created = listIssues(project.id).find((x) => x.title === gh.title && x.githubIssueNumber == null)
      if (created) {
        updateIssue(created.id, { githubIssueNumber: gh.number, syncedAt: new Date().toISOString() } as Parameters<typeof updateIssue>[1])
      }
    } else {
      // Compare timestamps and decide direction
      const ghUpdated = new Date(gh.updated_at).getTime()
      const localUpdated = new Date(existing.updatedAt).getTime()

      if (ghUpdated > localUpdated) {
        // GH is newer — update local
        try {
          updateIssue(existing.id, {
            title: gh.title,
            description: gh.body ?? null,
            status: ghStatus,
            syncedAt: new Date().toISOString(),
          } as Parameters<typeof updateIssue>[1])
          result.updated++
        } catch (err: unknown) {
          result.errors.push(`Update #${gh.number}: ${err instanceof Error ? err.message : String(err)}`)
        }
      } else if (localUpdated > ghUpdated) {
        // Local is newer — push to GH
        try {
          await pushIssueToGitHub(octokit, owner, repo, existing)
          result.pushed++
        } catch (err: unknown) {
          result.errors.push(`Push #${existing.number}: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
    }
  }

  // 3. Push local issues with no GH number
  const unsynced = listIssues(project.id).filter((i) => i.githubIssueNumber == null)
  if (unsynced.length > 0) {
    onProgress({ phase: 'pushing', current: 0, total: unsynced.length, message: `Pushing ${unsynced.length} new issues to GitHub…` })
    for (let i = 0; i < unsynced.length; i++) {
      const issue = unsynced[i]
      onProgress({ phase: 'pushing', current: i + 1, total: unsynced.length, message: `Pushing: ${issue.title}` })
      try {
        const response = await octokit.rest.issues.create({
          owner, repo,
          title: issue.title,
          body: issue.description ?? undefined,
        })
        updateIssue(issue.id, {
          githubIssueNumber: response.data.number,
          syncedAt: new Date().toISOString(),
        } as Parameters<typeof updateIssue>[1])
        result.pushed++
      } catch (err: unknown) {
        result.errors.push(`Push "${issue.title}": ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  onProgress({ phase: 'done', current: total, total, message: 'Sync complete' })
  return result
}

// ─── Helpers ───

async function pushIssueToGitHub(
  octokit: Octokit,
  owner: string,
  repo: string,
  issue: ReturnType<typeof getIssue>,
): Promise<void> {
  if (!issue || !issue.githubIssueNumber) return
  const state = issue.status === 'done' || issue.status === 'cancelled' ? 'closed' : 'open'
  await octokit.rest.issues.update({
    owner, repo,
    issue_number: issue.githubIssueNumber,
    title: issue.title,
    body: issue.description ?? undefined,
    state,
  })
}

function mapGhStatus(gh: { state: string; labels: Array<{ name?: string }> }): 'todo' | 'in_progress' | 'done' | 'cancelled' {
  if (gh.state === 'closed') return 'done'
  const labelNames = gh.labels.map((l) => l.name ?? '')
  if (labelNames.includes('status:in-progress')) return 'in_progress'
  return 'todo'
}
