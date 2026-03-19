import { join } from 'path'
import { app } from 'electron'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

export type DB = ReturnType<typeof drizzle<typeof schema>>

let _db: DB | null = null

export function getDb(): DB {
  if (_db) return _db

  const dbPath = join(app.getPath('userData'), 'pm.db')
  const sqlite = new Database(dbPath)

  // WAL mode for better concurrent read performance
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  _db = drizzle(sqlite, { schema })

  // Create tables if they don't exist (no migrations needed for local-first MVP)
  initSchema(sqlite)

  return _db
}

function initSchema(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      description  TEXT,
      github_owner TEXT,
      github_repo  TEXT,
      color        TEXT DEFAULT '#d97757',
      icon         TEXT,
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS labels (
      id         TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      color      TEXT NOT NULL DEFAULT '#8a8a80'
    );

    CREATE TABLE IF NOT EXISTS issues (
      id                  TEXT PRIMARY KEY,
      project_id          TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      number              INTEGER NOT NULL,
      title               TEXT NOT NULL,
      description         TEXT,
      status              TEXT NOT NULL DEFAULT 'todo',
      priority            TEXT NOT NULL DEFAULT 'none',
      assignee            TEXT,
      github_issue_number INTEGER,
      github_pr_number    INTEGER,
      github_node_id      TEXT,
      synced_at           TEXT,
      created_at          TEXT NOT NULL,
      updated_at          TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_project_issue_number ON issues(project_id, number);
    CREATE INDEX IF NOT EXISTS idx_issues_project ON issues(project_id);
    CREATE INDEX IF NOT EXISTS idx_issues_status  ON issues(status);

    CREATE TABLE IF NOT EXISTS issue_labels (
      issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
      label_id TEXT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
      PRIMARY KEY (issue_id, label_id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id         TEXT PRIMARY KEY,
      issue_id   TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
      body       TEXT NOT NULL,
      author     TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
}
