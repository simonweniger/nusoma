import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core'

export const projects = sqliteTable('projects', {
  id:          text('id').primaryKey(),
  name:        text('name').notNull(),
  description: text('description'),
  githubOwner: text('github_owner'),
  githubRepo:  text('github_repo'),
  color:       text('color').default('#d97757'),
  icon:        text('icon'),
  createdAt:   text('created_at').notNull(),
  updatedAt:   text('updated_at').notNull(),
})

export const labels = sqliteTable('labels', {
  id:        text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name:      text('name').notNull(),
  color:     text('color').default('#8a8a80').notNull(),
})

export const issues = sqliteTable('issues', {
  id:                text('id').primaryKey(),
  projectId:         text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  number:            integer('number').notNull(),
  title:             text('title').notNull(),
  description:       text('description'),
  status:            text('status').default('todo').notNull(),
  priority:          text('priority').default('none').notNull(),
  assignee:          text('assignee'),
  githubIssueNumber: integer('github_issue_number'),
  githubPrNumber:    integer('github_pr_number'),
  githubNodeId:      text('github_node_id'),
  syncedAt:          text('synced_at'),
  createdAt:         text('created_at').notNull(),
  updatedAt:         text('updated_at').notNull(),
})

export const issueLabels = sqliteTable('issue_labels', {
  issueId: text('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
  labelId: text('label_id').notNull().references(() => labels.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.issueId, t.labelId] })])

export const comments = sqliteTable('comments', {
  id:        text('id').primaryKey(),
  issueId:   text('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
  body:      text('body').notNull(),
  author:    text('author'),
  createdAt: text('created_at').notNull(),
})

export const settings = sqliteTable('settings', {
  key:   text('key').primaryKey(),
  value: text('value').notNull(),
})
