import { eq } from 'drizzle-orm'
import { getDb } from './db'
import { projects } from './schema'
import type { Project, CreateProjectInput } from '../../shared/pm-types'

function now(): string {
  return new Date().toISOString()
}

export function listProjects(): Project[] {
  const db = getDb()
  const rows = db.select().from(projects).orderBy(projects.createdAt).all()
  return rows.map(toProject)
}

export function getProject(id: string): Project | null {
  const db = getDb()
  const row = db.select().from(projects).where(eq(projects.id, id)).get()
  return row ? toProject(row) : null
}

export function createProject(input: CreateProjectInput): Project {
  const db = getDb()
  const id = crypto.randomUUID()
  const ts = now()
  db.insert(projects).values({
    id,
    name: input.name,
    description: input.description ?? null,
    githubOwner: input.githubOwner ?? null,
    githubRepo: input.githubRepo ?? null,
    color: input.color ?? '#d97757',
    icon: input.icon ?? null,
    createdAt: ts,
    updatedAt: ts,
  }).run()
  return getProject(id)!
}

export function updateProject(id: string, input: Partial<CreateProjectInput>): Project {
  const db = getDb()
  const updates: Record<string, unknown> = { updatedAt: now() }
  if (input.name !== undefined) updates.name = input.name
  if (input.description !== undefined) updates.description = input.description
  if (input.githubOwner !== undefined) updates.githubOwner = input.githubOwner
  if (input.githubRepo !== undefined) updates.githubRepo = input.githubRepo
  if (input.color !== undefined) updates.color = input.color
  if (input.icon !== undefined) updates.icon = input.icon
  db.update(projects).set(updates).where(eq(projects.id, id)).run()
  return getProject(id)!
}

export function deleteProject(id: string): void {
  const db = getDb()
  db.delete(projects).where(eq(projects.id, id)).run()
}

function toProject(row: typeof projects.$inferSelect): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    githubOwner: row.githubOwner,
    githubRepo: row.githubRepo,
    color: row.color ?? '#d97757',
    icon: row.icon,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
