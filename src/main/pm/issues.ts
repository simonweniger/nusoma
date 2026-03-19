import { eq, and, inArray, sql, desc } from 'drizzle-orm'
import { getDb } from './db'
import { issues, labels, issueLabels } from './schema'
import type { Issue, Label, CreateIssueInput, IssueFilters } from '../../shared/pm-types'

function now(): string {
  return new Date().toISOString()
}

export function listIssues(projectId: string, filters?: IssueFilters): Issue[] {
  const db = getDb()
  let query = db.select().from(issues).where(eq(issues.projectId, projectId))

  const rows = query.orderBy(desc(issues.createdAt)).all()

  let filtered = rows
  if (filters?.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
    filtered = filtered.filter((r) => statuses.includes(r.status as Issue['status']))
  }
  if (filters?.priority) {
    filtered = filtered.filter((r) => r.priority === filters.priority)
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase()
    filtered = filtered.filter((r) => r.title.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q))
  }

  return filtered.map((row) => toIssue(row, getIssueLabels(row.id)))
}

export function getIssue(id: string): Issue | null {
  const db = getDb()
  const row = db.select().from(issues).where(eq(issues.id, id)).get()
  if (!row) return null
  return toIssue(row, getIssueLabels(id))
}

export function createIssue(input: CreateIssueInput): Issue {
  const db = getDb()
  const id = crypto.randomUUID()
  const ts = now()

  // Auto-increment per-project number
  const maxRow = db
    .select({ maxNum: sql<number>`MAX(${issues.number})` })
    .from(issues)
    .where(eq(issues.projectId, input.projectId))
    .get()
  const number = (maxRow?.maxNum ?? 0) + 1

  db.insert(issues).values({
    id,
    projectId: input.projectId,
    number,
    title: input.title,
    description: input.description ?? null,
    status: input.status ?? 'todo',
    priority: input.priority ?? 'none',
    assignee: input.assignee ?? null,
    githubIssueNumber: null,
    githubPrNumber: null,
    githubNodeId: null,
    syncedAt: null,
    createdAt: ts,
    updatedAt: ts,
  }).run()

  if (input.labelIds?.length) {
    setIssueLabels(id, input.labelIds)
  }

  return getIssue(id)!
}

export function updateIssue(id: string, input: Partial<Issue>): Issue {
  const db = getDb()
  const updates: Record<string, unknown> = { updatedAt: now() }

  const fields = ['title', 'description', 'status', 'priority', 'assignee',
    'githubIssueNumber', 'githubPrNumber', 'githubNodeId', 'syncedAt'] as const
  for (const f of fields) {
    if (f in input) updates[camelToSnake(f)] = (input as Record<string, unknown>)[f]
  }

  db.update(issues).set(updates).where(eq(issues.id, id)).run()

  if (input.labels !== undefined) {
    setIssueLabels(id, input.labels.map((l) => l.id))
  }

  return getIssue(id)!
}

export function deleteIssue(id: string): void {
  const db = getDb()
  db.delete(issues).where(eq(issues.id, id)).run()
}

// ─── Labels ───

export function listLabels(projectId: string): Label[] {
  const db = getDb()
  return db.select().from(labels).where(eq(labels.projectId, projectId)).all().map(toLabel)
}

export function createLabel(projectId: string, name: string, color: string): Label {
  const db = getDb()
  const id = crypto.randomUUID()
  db.insert(labels).values({ id, projectId, name, color }).run()
  return { id, projectId, name, color }
}

export function deleteLabel(id: string): void {
  const db = getDb()
  db.delete(labels).where(eq(labels.id, id)).run()
}

function getIssueLabels(issueId: string): Label[] {
  const db = getDb()
  const rows = db
    .select({ id: labels.id, projectId: labels.projectId, name: labels.name, color: labels.color })
    .from(issueLabels)
    .innerJoin(labels, eq(issueLabels.labelId, labels.id))
    .where(eq(issueLabels.issueId, issueId))
    .all()
  return rows.map(toLabel)
}

function setIssueLabels(issueId: string, labelIds: string[]): void {
  const db = getDb()
  db.delete(issueLabels).where(eq(issueLabels.issueId, issueId)).run()
  if (labelIds.length) {
    db.insert(issueLabels)
      .values(labelIds.map((labelId) => ({ issueId, labelId })))
      .run()
  }
}

// ─── Helpers ───

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
}

function toIssue(row: typeof issues.$inferSelect, issueLabels: Label[]): Issue {
  return {
    id: row.id,
    projectId: row.projectId,
    number: row.number,
    title: row.title,
    description: row.description,
    status: row.status as Issue['status'],
    priority: row.priority as Issue['priority'],
    assignee: row.assignee,
    githubIssueNumber: row.githubIssueNumber,
    githubPrNumber: row.githubPrNumber,
    githubNodeId: row.githubNodeId,
    syncedAt: row.syncedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    labels: issueLabels,
  }
}

function toLabel(row: typeof labels.$inferSelect): Label {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    color: row.color,
  }
}
