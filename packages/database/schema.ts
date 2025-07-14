import { relations, sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  customType,
  decimal,
  foreignKey,
  index,
  integer,
  json,
  jsonb,
  pgEnum,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  vector,
} from 'drizzle-orm/pg-core'
import { authenticatedRole } from 'drizzle-orm/supabase'

// Custom Types
export const bytea = customType<{
  data: Buffer | null
  notNull: false
  default: false
}>({
  dataType() {
    return 'bytea'
  },
  toDriver(val: Buffer | null) {
    return val
  },
  fromDriver(value: unknown) {
    if (value === null) {
      return null
    }

    if (value instanceof Buffer) {
      return value
    }

    if (typeof value === 'string') {
      return Buffer.from(value, 'hex')
    }

    throw new Error(`Unexpected type received from driver: ${typeof value}`)
  },
})

// Custom tsvector type for full-text search
export const tsvector = customType<{
  data: string
}>({
  dataType() {
    return 'tsvector'
  },
})

function enumToPgEnum<T extends Record<string, string>>(myEnum: T) {
  return Object.values(myEnum).map((value) => `${value}`) as [T[keyof T], ...T[keyof T][]]
}
export enum ActionType {
  CREATE = 'create',
  UPDATE = 'update',
  EDIT = 'edit',
  TASK_IN_QUEUE = 'taskInQueue',
  TASK_REMOVED_FROM_QUEUE = 'taskRemovedFromQueue',
  ASSIGN_WORKER = 'assignWorker',
  UNASSIGN_WORKER = 'unassignWorker',
  TASK_EXECUTED = 'taskExecuted',
  TASK_COMPLETED = 'taskCompleted',
  TASK_CANCELLED = 'taskCancelled',
  TASK_FAILED = 'taskFailed',
  TASK_SKIPPED = 'taskSkipped',
  TASK_PAUSED = 'taskPaused',
  BLOCK_EXECUTED = 'blockExecuted',
  DELETE = 'delete',
}

export enum ActorType {
  SYSTEM = 'system',
  MEMBER = 'member',
  API = 'api',
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum ProjectStage {
  TODO = 'todo',
  IN_PROGRESS = 'inProgress',
  IN_REVIEW = 'inReview',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'inProgress',
  WORK_COMPLETE = 'workComplete',
  HUMAN_NEEDED = 'humanNeeded',
  REVIEWED = 'reviewed',
  ERROR = 'error',
}

export enum WorkerStage {
  DRAFT = 'draft',
  PAUSED = 'paused',
  LIVE = 'live',
}

export enum WorkerRecord {
  SINGLE = 'single',
  TEAM = 'team',
}

export enum WorkspaceMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}

export enum WebhookTrigger {
  WORKER_CREATED = 'workerCreated',
  WORKER_UPDATED = 'workerUpdated',
  WORKER_DELETED = 'workerDeleted',
  TASK_CREATED = 'taskCreated',
  TASK_UPDATED = 'taskUpdated',
  TASK_DELETED = 'taskDeleted',
  PROJECT_CREATED = 'projectCreated',
  PROJECT_UPDATED = 'projectUpdated',
  PROJECT_DELETED = 'projectDeleted',
  MEMBER_CREATED = 'memberCreated',
  MEMBER_UPDATED = 'memberUpdated',
  MEMBER_DELETED = 'memberDeleted',
  CHAT_CREATED = 'chatCreated',
  CHAT_UPDATED = 'chatUpdated',
  CHAT_DELETED = 'chatDeleted',
}

export enum DayOfWeek {
  SUNDAY = 'sunday',
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
}

export enum PermissionType {
  ADMIN = 'admin',
  WRITE = 'write',
  READ = 'read',
}

export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export const permissionTypeEnum = pgEnum('permission_type', enumToPgEnum(PermissionType))
export const actionTypeEnum = pgEnum('action_type', enumToPgEnum(ActionType))
export const actorTypeEnum = pgEnum('actor_type', enumToPgEnum(ActorType))
export const priorityEnum = pgEnum('priority', enumToPgEnum(Priority))
export const projectStageEnum = pgEnum('project_stage', enumToPgEnum(ProjectStage))
export const projectTaskStatusEnum = pgEnum('project_task_status', enumToPgEnum(TaskStatus))
export const dayOfWeekEnum = pgEnum('day_of_week', enumToPgEnum(DayOfWeek))
export const workspaceMemberRoleEnum = pgEnum(
  'workspace_member_role',
  enumToPgEnum(WorkspaceMemberRole)
)
export const workerRecordEnum = pgEnum('worker_record', enumToPgEnum(WorkerRecord))
export const workerStageEnum = pgEnum('worker_stage', enumToPgEnum(WorkerStage))
export const webhookTriggerEnum = pgEnum('webhook_trigger', enumToPgEnum(WebhookTrigger))
export const processingStatusEnum = pgEnum('processing_status', enumToPgEnum(ProcessingStatus))

export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    entityType: text('entity_type').notNull(), // 'workspace', 'worker', 'organization', etc.
    entityId: text('entity_id').notNull(), // ID of the workspace, worker, etc.
    permissionType: permissionTypeEnum('permission_type').notNull(), // Use enum instead of text
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // Primary access pattern - get all permissions for a user
    userIdIdx: index('permissions_user_id_idx').on(table.userId),

    // Entity-based queries - get all users with permissions on an entity
    entityIdx: index('permissions_entity_idx').on(table.entityType, table.entityId),

    // User + entity type queries - get user's permissions for all workspaces
    userEntityTypeIdx: index('permissions_user_entity_type_idx').on(table.userId, table.entityType),

    // Specific permission checks - does user have specific permission on entity
    userEntityPermissionIdx: index('permissions_user_entity_permission_idx').on(
      table.userId,
      table.entityType,
      table.permissionType
    ),

    // User + specific entity queries - get user's permissions for specific entity
    userEntityIdx: index('permissions_user_entity_idx').on(
      table.userId,
      table.entityType,
      table.entityId
    ),

    // Uniqueness constraint - prevent duplicate permission rows (one permission per user/entity)
    uniquePermissionConstraint: uniqueIndex('permissions_unique_constraint').on(
      table.userId,
      table.entityType,
      table.entityId
    ),
  })
)

export const user = pgTable(
  'user',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').notNull(),
    locale: text('locale').notNull().default('en'),
    image: text('image'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    stripeCustomerId: text('stripe_customer_id'),
  },
  (t) => ({
    rlsPolicy: pgPolicy('allow_individual_read_access', {
      using: sql`auth.uid() = ${t.id}`,
      for: 'select',
      to: authenticatedRole,
    }),
  })
)

export const session = pgTable('session', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  activeOrganizationId: uuid('active_organization_id').references(() => organization.id, {
    onDelete: 'set null',
  }),
})

export const account = pgTable('account', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
})

export const chat = pgTable('chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  workerId: uuid('worker_id')
    .notNull()
    .references(() => worker.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  customizations: json('customizations').default('{}'), // For UI customization options
  // Output configuration
  outputConfigs: json('output_configs').default('[]'), // Array of {blockId, path} objects

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const message = pgTable('message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chat_id')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  parts: json('parts').notNull(),
  attachments: json('attachments').notNull(),
  createdAt: timestamp('created_at').notNull(),
})

export const vote = pgTable(
  'vote',
  {
    chatId: uuid('chat_id')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('message_id')
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean('is_upvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    }
  }
)

export const artifactDocument = pgTable(
  'artifact_document',
  {
    id: uuid('id').notNull().defaultRandom(),
    createdAt: timestamp('created_at').notNull(),
    title: text('title').notNull(),
    content: text('content'),
    kind: varchar('text', { enum: ['text', 'code', 'image', 'sheet'] })
      .notNull()
      .default('text'),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    }
  }
)

export const suggestion = pgTable(
  'suggestion',
  {
    id: uuid('id').notNull().defaultRandom(),
    artifactDocumentId: uuid('artifact_document_id').notNull(),
    artifactDocumentCreatedAt: timestamp('artifact_document_created_at').notNull(),
    originalText: text('original_text').notNull(),
    suggestedText: text('suggested_text').notNull(),
    description: text('description'),
    isResolved: boolean('is_resolved').notNull().default(false),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('created_at').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.artifactDocumentId, table.artifactDocumentCreatedAt],
      foreignColumns: [artifactDocument.id, artifactDocument.createdAt],
      name: 'suggestion_artifact_document_fk',
    }),
  })
)

export const stream = pgTable(
  'stream',
  {
    id: uuid('id').notNull().defaultRandom(),
    chatId: uuid('chat_id').notNull(),
    createdAt: timestamp('created_at').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  })
)

export const workerComment = pgTable(
  'worker_comment',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    workerId: uuid('worker_id')
      .notNull()
      .references(() => worker.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    text: varchar('text', { length: 2000 }).notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('worker_comment_worker_id_idx').using(
      'btree',
      table.workerId.asc().nullsLast().op('uuid_ops')
    ),
    index('worker_comment_user_id_idx').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops')
    ),
  ]
)

export const workerNote = pgTable(
  'worker_note',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    workerId: uuid('worker_id')
      .notNull()
      .references(() => worker.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    text: varchar('text', { length: 8000 }),
    createdAt: timestamp('created_at', { precision: 3, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('worker_note_worker_id_idx').using(
      'btree',
      table.workerId.asc().nullsLast().op('uuid_ops')
    ),
    index('worker_note_user_id_idx').using('btree', table.userId.asc().nullsLast().op('uuid_ops')),
  ]
)

export const task = pgTable(
  'task',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspace.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    projectId: uuid('project_id').references(() => project.id, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),
    title: varchar('title', { length: 255 }).notNull(),
    description: varchar('description', { length: 8000 }),
    assigneeId: uuid('assignee_id').references(() => worker.id, {
      onDelete: 'set null',
    }),
    tags: text('tags').array(),
    rawResult: jsonb('raw_result').notNull(),
    resultReport: text('result_report').notNull(),
    approvedBy: uuid('approved_by').references(() => user.id, {
      onDelete: 'set null',
    }),
    rejectedBy: uuid('rejected_by').references(() => user.id, {
      onDelete: 'set null',
    }),
    priority: priorityEnum('priority').default(Priority.LOW).notNull(),
    status: projectTaskStatusEnum('status').default(TaskStatus.TODO).notNull(),
    scheduleDate: timestamp('schedule_date', { precision: 3, mode: 'date' }),
    createdAt: timestamp('created_at', { precision: 3, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    // Primary indexes
    ixWorkspaceId: index('task_workspace_id_idx').using(
      'btree',
      t.workspaceId.asc().nullsLast().op('uuid_ops')
    ),
    projectIdIdx: index('task_project_id_idx').on(t.projectId),
    assigneeIdIdx: index('task_assignee_id_idx').on(t.assigneeId),
    statusIdx: index('task_status_idx').on(t.status),
    priorityIdx: index('task_priority_idx').on(t.priority),
    createdAtIdx: index('task_created_at_idx').on(t.createdAt),
    updatedAtIdx: index('task_updated_at_idx').on(t.updatedAt),
    scheduleDateIdx: index('task_schedule_date_idx').on(t.scheduleDate),

    // Composite indexes for common query patterns
    assigneeStatusIdx: index('task_assignee_status_idx').on(t.assigneeId, t.status),
    projectCreatedIdx: index('task_project_created_idx').on(t.projectId, t.createdAt),
    workspaceStatusIdx: index('task_workspace_status_idx').on(t.workspaceId, t.status),
    workspaceStatusPriorityIdx: index('task_workspace_status_priority_idx').on(
      t.workspaceId,
      t.status,
      t.priority
    ),
    workspaceAssigneeIdx: index('task_workspace_assignee_idx').on(t.workspaceId, t.assigneeId),
    statusScheduleDateIdx: index('task_status_schedule_date_idx').on(t.status, t.scheduleDate),

    // GIN indexes for array and JSON columns
    tagsGinIdx: index('task_tags_gin_idx').using('gin', t.tags.op('array_ops')),
    rawResultGinIdx: index('task_raw_result_gin_idx').using('gin', t.rawResult.op('jsonb_ops')),

    rlsPolicy: pgPolicy('allow_members_crud_tasks_in_workspace', {
      using: sql`(EXISTS (SELECT 1 FROM "workspace_member" WHERE "workspace_member"."workspace_id" = ${t.workspaceId} AND "workspace_member"."user_id" = auth.uid()))`,
      withCheck: sql`(EXISTS (SELECT 1 FROM "workspace_member" WHERE "workspace_member"."workspace_id" = ${t.workspaceId} AND "workspace_member"."user_id" = auth.uid()))`,
      for: 'all',
      to: authenticatedRole,
    }),
  })
)

export const taskComment = pgTable(
  'task_comment',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => task.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    text: varchar('text', { length: 2000 }).notNull(),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('IX_task_comment_task_id').using('btree', table.taskId.asc().nullsLast().op('uuid_ops')),
    index('IX_task_comment_user_id').using('btree', table.userId.asc().nullsLast().op('uuid_ops')),
    index('IX_task_comment_created_at').on(table.createdAt),
  ]
)

export const taskActivity = pgTable(
  'task_activity',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => task.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    actionType: actionTypeEnum('action_type').notNull(),
    actorId: varchar('actor_id', { length: 255 }).notNull(),
    actorType: actorTypeEnum('actor_type').notNull(),
    metadata: jsonb('metadata'),
    occurredAt: timestamp('occurred_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('IX_task_activity_task_id').using('btree', table.taskId.asc().nullsLast().op('uuid_ops')),
    index('IX_task_activity_occurred_at').using(
      'btree',
      table.occurredAt.asc().nullsLast().op('timestamptz_ops')
    ),
    index('IX_task_activity_action_type').on(table.actionType),
    index('IX_task_activity_actor_type').on(table.actorType),
    // Composite index for filtering by task and action type
    index('IX_task_activity_task_action').on(table.taskId, table.actionType),
  ]
)

export const verification = pgTable('verification', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
})

export const project = pgTable(
  'project',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspace.id, {
        onDelete: 'cascade',
      }),
    name: varchar('name', { length: 255 }).notNull(),
    description: varchar('description', { length: 2048 }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => user.id, {
        onDelete: 'cascade',
      }),
    createdAt: timestamp('created_at', { precision: 3, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    stage: projectStageEnum('stage').default(ProjectStage.TODO).notNull(),
    priority: priorityEnum('priority').default(Priority.LOW).notNull(),
  },
  (t) => ({
    rlsPolicy: pgPolicy('allow_members_crud_projects_in_workspace', {
      using: sql`(EXISTS (SELECT 1 FROM "workspace_member" WHERE "workspace_member"."workspace_id" = ${t.workspaceId} AND "workspace_member"."user_id" = auth.uid()))`,
      withCheck: sql`(EXISTS (SELECT 1 FROM "workspace_member" WHERE "workspace_member"."workspace_id" = ${t.workspaceId} AND "workspace_member"."user_id" = auth.uid()))`,
      for: 'all',
      to: authenticatedRole,
    }),
  })
)

export const projectNote = pgTable(
  'project_note',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => project.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    text: varchar('text', { length: 8000 }),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    projectIdIdx: index('project_note_project_id_idx').on(table.projectId),
    userIdIdx: index('project_note_user_id_idx').on(table.userId),
    createdAtIdx: index('project_note_created_at_idx').on(table.createdAt),
    projectCreatedIdx: index('project_note_project_created_idx').on(
      table.projectId,
      table.createdAt
    ),
  })
)

export const projectActivity = pgTable(
  'project_activity',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => project.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    actionType: actionTypeEnum('action_type').notNull(),
    actorId: varchar('actor_id', { length: 255 }).notNull(),
    actorType: actorTypeEnum('actor_type').notNull(),
    metadata: jsonb('metadata'),
    occurredAt: timestamp('occurred_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('IX_project_activity_project_id').using(
      'btree',
      table.projectId.asc().nullsLast().op('uuid_ops')
    ),
    index('IX_project_activity_occurred_at').using(
      'btree',
      table.occurredAt.asc().nullsLast().op('timestamptz_ops')
    ),
    index('IX_project_activity_action_type').on(table.actionType),
    index('IX_project_activity_actor_type').on(table.actorType),
    index('IX_project_activity_project_action').on(table.projectId, table.actionType),
    // GIN index for metadata JSON queries
    index('IX_project_activity_metadata_gin').using('gin', table.metadata.op('jsonb_ops')),
  ]
)

export const favorite = pgTable(
  'favorite',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    workerId: uuid('workerId')
      .notNull()
      .references(() => worker.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    projectId: uuid('projectId').references(() => project.id, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),
    taskId: uuid('taskId').references(() => task.id, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),
    order: integer('order').default(0).notNull(),
  },
  (table) => [
    index('IX_favorite_workerId').using('btree', table.workerId.asc().nullsLast().op('uuid_ops')),
    index('IX_favorite_userId').using('btree', table.userId.asc().nullsLast().op('uuid_ops')),
  ]
)

export const workerActivity = pgTable(
  'worker_activity',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    workerId: uuid('worker_id')
      .notNull()
      .references(() => worker.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    actionType: actionTypeEnum('action_type').notNull(),
    actorId: varchar('actor_id', { length: 255 }).notNull(),
    actorType: actorTypeEnum('actor_type').notNull(),
    metadata: jsonb('metadata'),
    occurredAt: timestamp('occurred_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('IX_worker_activity_worker_id').using(
      'btree',
      table.workerId.asc().nullsLast().op('uuid_ops')
    ),
    index('IX_worker_activity_occurred_at').using(
      'btree',
      table.occurredAt.asc().nullsLast().op('timestamptz_ops')
    ),
    index('IX_worker_activity_action_type').on(table.actionType),
    index('IX_worker_activity_actor_type').on(table.actorType),
    // Composite indexes
    index('IX_worker_activity_worker_action').on(table.workerId, table.actionType),
    // GIN index for metadata
    index('IX_worker_activity_metadata_gin').using('gin', table.metadata.op('jsonb_ops')),
  ]
)

export const projectTag = pgTable(
  'project_tag',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    text: varchar('text', { length: 128 }).notNull(),
    color: varchar('color', { length: 128 }).notNull().default('#3972F6'),
  },
  (table) => [
    uniqueIndex('IX_project_tag_text_unique').using(
      'btree',
      table.text.asc().nullsLast().op('text_ops')
    ),
  ]
)

export const taskTag = pgTable(
  'task_tag',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    text: varchar('text', { length: 128 }).notNull(),
    color: varchar('color', { length: 128 }).notNull().default('#3972F6'),
  },
  (table) => [
    uniqueIndex('IX_task_tag_text_unique').using(
      'btree',
      table.text.asc().nullsLast().op('text_ops')
    ),
  ]
)

export const taskToTaskTag = pgTable(
  'task_to_task_tag',
  {
    taskId: uuid('task_id')
      .notNull()
      .references(() => task.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    taskTagId: uuid('task_tag_id')
      .notNull()
      .references(() => taskTag.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
  },
  (table) => [
    {
      pk: primaryKey({
        columns: [table.taskId, table.taskTagId],
      }),
      taskIdIdx: index('IX_task_to_task_tag_task_id').on(table.taskId),
      taskTagIdIdx: index('IX_task_to_task_tag_task_tag_id').on(table.taskTagId),
    },
  ]
)

export const projectToProjectTag = pgTable(
  'project_to_project_tag',
  {
    projectId: uuid('project_id')
      .notNull()
      .references(() => project.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    projectTagId: uuid('project_tag_id')
      .notNull()
      .references(() => projectTag.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
  },
  (table) => [
    {
      pk: primaryKey({
        columns: [table.projectId, table.projectTagId],
      }),
      projectIdIdx: index('IX_project_to_project_tag_project_id').on(table.projectId),
      projectTagIdIdx: index('IX_project_to_project_tag_project_tag_id').on(table.projectTagId),
    },
  ]
)

export const workHoursTable = pgTable(
  'work_hours',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organization.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    dayOfWeek: dayOfWeekEnum('day_of_week').default(DayOfWeek.SUNDAY).notNull(),
  },
  (table) => [
    index('IX_work_hours_organization_id').using(
      'btree',
      table.organizationId.asc().nullsLast().op('uuid_ops')
    ),
    index('IX_work_hours_day_of_week').on(table.dayOfWeek),
    // Composite index for organization + day queries
    index('IX_work_hours_org_day').on(table.organizationId, table.dayOfWeek),
  ]
)

export const workTimeSlotTable = pgTable(
  'work_time_slot',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    workHoursId: uuid('work_hours_id')
      .notNull()
      .references(() => workHoursTable.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    start: timestamp('start', { precision: 2, withTimezone: false }).notNull(),
    end: timestamp('end', { precision: 2, withTimezone: false }).notNull(),
  },
  (table) => ({
    workHoursIdIdx: index('IX_work_time_slot_work_hours_id').using(
      'btree',
      table.workHoursId.asc().nullsLast().op('uuid_ops')
    ),
    startIdx: index('IX_work_time_slot_start').on(table.start),
    endIdx: index('IX_work_time_slot_end').on(table.end),
    // Composite index for time range queries
    hoursStartIdx: index('IX_work_time_slot_hours_start').on(table.workHoursId, table.start),

    // Check constraint to ensure end time is after start time
    timeRangeValid: check('work_time_slot_time_range_valid', sql`${table.end} > ${table.start}`),
  })
)

export const worker = pgTable(
  'worker',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id').references(() => workspace.id, {
      onDelete: 'cascade',
    }),
    organizationId: uuid('organization_id').references(() => organization.id, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),
    name: text('name').notNull(),
    description: text('description'),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 32 }),
    color: text('color').notNull().default('#3972F6'),
    folderId: text('folder_id').references(() => workerFolder.id, { onDelete: 'set null' }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => user.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    lastSynced: timestamp('last_synced').notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    isDeployed: boolean('is_deployed').notNull().default(false),
    deployedState: jsonb('deployed_state'),
    deployedAt: timestamp('deployed_at'),
    collaborators: jsonb('collaborators').notNull().default('[]'),
    runCount: integer('run_count').notNull().default(0),
    lastRunAt: timestamp('last_run_at'),
    variables: jsonb('variables').default('{}'),
    marketplaceData: jsonb('marketplace_data'), // Format: { id: string, status: 'owner' | 'temp' }

    // These columns are kept for backward compatibility during migration
    // @deprecated - Use marketplaceData instead
    isPublished: boolean('is_published').notNull().default(false),
  },
  (t) => ({
    // Performance indexes
    workspaceIdIdx: index('worker_workspace_id_idx').on(t.workspaceId),
    organizationIdIdx: index('worker_organization_id_idx').on(t.organizationId),
    createdByIdx: index('worker_created_by_idx').on(t.createdBy),
    folderIdIdx: index('worker_folder_id_idx').on(t.folderId),
    isDeployedIdx: index('worker_is_deployed_idx').on(t.isDeployed),
    lastRunAtIdx: index('worker_last_run_at_idx').on(t.lastRunAt),

    // Composite indexes for common queries
    workspaceDeployedIdx: index('worker_workspace_deployed_idx').on(t.workspaceId, t.isDeployed),
    workspaceCreatedIdx: index('worker_workspace_created_idx').on(t.workspaceId, t.createdAt),

    // GIN indexes for JSONB columns
    variablesGinIdx: index('worker_variables_gin_idx').using('gin', t.variables.op('jsonb_ops')),
    collaboratorsGinIdx: index('worker_collaborators_gin_idx').using(
      'gin',
      t.collaborators.op('jsonb_ops')
    ),
    deployedStateGinIdx: index('worker_deployed_state_gin_idx').using(
      'gin',
      t.deployedState.op('jsonb_ops')
    ),
    marketplaceDataGinIdx: index('worker_marketplace_data_gin_idx').using(
      'gin',
      t.marketplaceData.op('jsonb_ops')
    ),

    rlsPolicy: pgPolicy('allow_members_crud_workers_in_workspace', {
      using: sql`(EXISTS (SELECT 1 FROM "workspace_member" WHERE "workspace_member"."workspace_id" = ${t.workspaceId} AND "workspace_member"."user_id" = auth.uid()))`,
      withCheck: sql`(EXISTS (SELECT 1 FROM "workspace_member" WHERE "workspace_member"."workspace_id" = ${t.workspaceId} AND "workspace_member"."user_id" = auth.uid()))`,
      for: 'all',
      to: authenticatedRole,
    }),
  })
)

// New normalized worker tables
export const workerBlocks = pgTable(
  'worker_blocks',
  {
    // Primary identification
    id: text('id').primaryKey(), // Block UUID from the current JSON structure
    workerId: uuid('worker_id')
      .notNull()
      .references(() => worker.id, { onDelete: 'cascade' }), // Link to parent worker

    // Block properties (from current BlockState interface)
    type: text('type').notNull(), // e.g., 'starter', 'agent', 'api', 'function'
    name: text('name').notNull(), // Display name of the block

    // Position coordinates (from position.x, position.y)
    positionX: decimal('position_x').notNull(), // X coordinate on canvas
    positionY: decimal('position_y').notNull(), // Y coordinate on canvas

    // Block behavior flags (from current BlockState)
    enabled: boolean('enabled').notNull().default(true), // Whether block is active
    horizontalHandles: boolean('horizontal_handles').notNull().default(false), // UI layout preference - forces vertical edges
    isWide: boolean('is_wide').notNull().default(false), // Whether block uses wide layout
    height: decimal('height').notNull().default('0'), // Custom height override

    // Block data (keeping JSON for flexibility as current system does)
    subBlocks: jsonb('sub_blocks').notNull().default('{}'), // All subblock configurations
    outputs: jsonb('outputs').notNull().default('{}'), // Output type definitions
    data: jsonb('data').default('{}'), // Additional block-specific data

    // Hierarchy support (for loop/parallel child blocks)
    parentId: text('parent_id'), // Self-reference handled by foreign key constraint in migration
    extent: text('extent'), // 'parent' or null - for ReactFlow parent constraint

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // Primary access pattern: get all blocks for a worker
    workerIdIdx: index('worker_blocks_worker_id_idx').on(table.workerId),

    // For finding child blocks of a parent (loop/parallel containers)
    parentIdIdx: index('worker_blocks_parent_id_idx').on(table.parentId),

    // Composite index for efficient parent-child queries
    workerParentIdx: index('worker_blocks_worker_parent_idx').on(table.workerId, table.parentId),

    // For block type filtering/analytics
    workerTypeIdx: index('worker_blocks_worker_type_idx').on(table.workerId, table.type),
  })
)

export const workerEdges = pgTable(
  'worker_edges',
  {
    // Primary identification
    id: text('id').primaryKey(), // Edge UUID from ReactFlow
    workerId: uuid('worker_id')
      .notNull()
      .references(() => worker.id, { onDelete: 'cascade' }), // Link to parent worker

    // Connection definition (from ReactFlow Edge interface)
    sourceBlockId: text('source_block_id')
      .notNull()
      .references(() => workerBlocks.id, { onDelete: 'cascade' }), // Source block ID
    targetBlockId: text('target_block_id')
      .notNull()
      .references(() => workerBlocks.id, { onDelete: 'cascade' }), // Target block ID
    sourceHandle: text('source_handle'), // Specific output handle (optional)
    targetHandle: text('target_handle'), // Specific input handle (optional)

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    // Primary access pattern: get all edges for a worker
    workerIdIdx: index('worker_edges_worker_id_idx').on(table.workerId),

    // For finding outgoing connections from a block
    sourceBlockIdx: index('worker_edges_source_block_idx').on(table.sourceBlockId),

    // For finding incoming connections to a block
    targetBlockIdx: index('worker_edges_target_block_idx').on(table.targetBlockId),

    // For comprehensive worker topology queries
    workerSourceIdx: index('worker_edges_worker_source_idx').on(
      table.workerId,
      table.sourceBlockId
    ),
    workerTargetIdx: index('worker_edges_worker_target_idx').on(
      table.workerId,
      table.targetBlockId
    ),
  })
)

export const workerSubflows = pgTable(
  'worker_subflows',
  {
    // Primary identification
    id: text('id').primaryKey(), // Subflow UUID (currently loop/parallel ID)
    workerId: uuid('worker_id')
      .notNull()
      .references(() => worker.id, { onDelete: 'cascade' }), // Link to parent worker

    // Subflow type and configuration
    type: text('type').notNull(), // 'loop' or 'parallel' (extensible for future types)
    config: jsonb('config').notNull().default('{}'), // Type-specific configuration

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // Primary access pattern: get all subflows for a worker
    workerIdIdx: index('worker_subflows_worker_id_idx').on(table.workerId),

    // For filtering by subflow type
    workerTypeIdx: index('worker_subflows_worker_type_idx').on(table.workerId, table.type),
  })
)

export const workerLogs = pgTable(
  'worker_logs',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    workerId: uuid('worker_id')
      .notNull()
      .references(() => worker.id, { onDelete: 'cascade' }),
    executionId: text('execution_id'),
    executionResult: jsonb('execution_result'),
    level: text('level').notNull(), // e.g. "info", "error", etc.
    message: text('message').notNull(),
    duration: text('duration'), // Store as text to allow 'NA' for errors
    trigger: text('trigger'), // e.g. "api", "schedule", "manual"
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb('metadata'), // Optional JSON field for storing additional context like tool calls
  },
  (table) => ({
    // Performance indexes for common query patterns
    workerIdIdx: index('worker_logs_worker_id_idx').on(table.workerId),
    levelIdx: index('worker_logs_level_idx').on(table.level),
    createdAtIdx: index('worker_logs_created_at_idx').on(table.createdAt),
    executionIdIdx: index('worker_logs_execution_id_idx').on(table.executionId),
    triggerIdx: index('worker_logs_trigger_idx').on(table.trigger),

    // Composite indexes for filtering
    workerLevelIdx: index('worker_logs_worker_level_idx').on(table.workerId, table.level),
    levelCreatedIdx: index('worker_logs_level_created_idx').on(table.level, table.createdAt),
    workerCreatedIdx: index('worker_logs_worker_created_idx').on(table.workerId, table.createdAt),

    // GIN index for metadata JSONB queries
    metadataGinIdx: index('worker_logs_metadata_gin_idx').using(
      'gin',
      table.metadata.op('jsonb_ops')
    ),
    executionResultGinIdx: index('worker_logs_execution_result_gin_idx').using(
      'gin',
      table.executionResult.op('jsonb_ops')
    ),
  })
)

export const environment = pgTable('environment', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' })
    .unique(), // One environment per user
  variables: json('variables').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const settings = pgTable('settings', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' })
    .unique(), // One settings record per user

  // General settings
  theme: text('theme').notNull().default('system'),
  debugMode: boolean('debug_mode').notNull().default(false),
  autoConnect: boolean('auto_connect').notNull().default(true),
  autoFillEnvVars: boolean('auto_fill_env_vars').notNull().default(true),

  // Privacy settings
  telemetryEnabled: boolean('telemetry_enabled').notNull().default(true),

  // Keep general for future flexible settings
  general: json('general').notNull().default('{}'),

  // Email preferences
  emailPreferences: json('email_preferences').notNull().default('{}'),

  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const workerSchedule = pgTable('worker_schedule', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  workerId: uuid('worker_id')
    .notNull()
    .references(() => worker.id, { onDelete: 'cascade' })
    .unique(),
  cronExpression: text('cron_expression'),
  nextRunAt: timestamp('next_run_at'),
  lastRanAt: timestamp('last_ran_at'),
  triggerType: text('trigger_type').notNull(), // "manual", "webhook", "schedule"
  timezone: text('timezone').notNull().default('UTC'),
  failedCount: integer('failed_count').notNull().default(0), // Track consecutive failures
  status: text('status').notNull().default('active'), // 'active' or 'disabled'
  lastFailedAt: timestamp('last_failed_at'), // When the schedule last failed
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const webhook = pgTable(
  'webhook',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    workerId: uuid('worker_id')
      .notNull()
      .references(() => worker.id, { onDelete: 'cascade' }),
    path: text('path').notNull(),
    provider: text('provider'), // e.g., "whatsapp", "github", etc.
    providerConfig: json('provider_config'), // Store provider-specific configuration
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => {
    return {
      // Ensure webhook paths are unique
      pathIdx: uniqueIndex('path_idx').on(table.path),
    }
  }
)

export const apiKey = pgTable(
  'api_key',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    key: text('key').notNull().unique(),
    lastUsed: timestamp('last_used', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (table) => ({
    // Performance indexes
    userIdIdx: index('api_key_user_id_idx').on(table.userId),
    keyIdx: index('api_key_key_idx').on(table.key), // For fast key lookups
    expiresAtIdx: index('api_key_expires_at_idx').on(table.expiresAt), // For cleanup jobs
    lastUsedIdx: index('api_key_last_used_idx').on(table.lastUsed),
    createdAtIdx: index('api_key_created_at_idx').on(table.createdAt),

    // Composite indexes
    userCreatedIdx: index('api_key_user_created_idx').on(table.userId, table.createdAt),
  })
)

export const marketplace = pgTable('marketplace', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  workerId: uuid('worker_id')
    .notNull()
    .references(() => worker.id, { onDelete: 'cascade' }),
  state: json('state').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  authorId: uuid('author_id')
    .notNull()
    .references(() => user.id),
  authorName: text('author_name').notNull(),
  views: integer('views').notNull().default(0),
  category: text('category'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const userStats = pgTable(
  'user_stats',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' })
      .unique(), // One record per user
    totalManualExecutions: bigint('total_manual_executions', { mode: 'number' })
      .notNull()
      .default(0),
    totalApiCalls: bigint('total_api_calls', { mode: 'number' }).notNull().default(0),
    totalWebhookTriggers: bigint('total_webhook_triggers', { mode: 'number' }).notNull().default(0),
    totalScheduledExecutions: bigint('total_scheduled_executions', { mode: 'number' })
      .notNull()
      .default(0),
    totalChatExecutions: bigint('total_chat_executions', { mode: 'number' }).notNull().default(0),
    totalTokensUsed: bigint('total_tokens_used', { mode: 'number' }).notNull().default(0),
    totalCost: decimal('total_cost', { precision: 10, scale: 4 }).notNull().default('0'),
    lastActive: timestamp('last_active', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Indexes for performance
    userIdIdx: index('user_stats_user_id_idx').on(table.userId),
    lastActiveIdx: index('user_stats_last_active_idx').on(table.lastActive),

    // Check constraints for data validation
    totalCostPositive: check('user_stats_total_cost_positive', sql`${table.totalCost} >= 0`),
    totalTokensPositive: check(
      'user_stats_total_tokens_positive',
      sql`${table.totalTokensUsed} >= 0`
    ),
    executionCountsPositive: check(
      'user_stats_execution_counts_positive',
      sql`${table.totalManualExecutions} >= 0 AND ${table.totalApiCalls} >= 0 AND ${table.totalWebhookTriggers} >= 0 AND ${table.totalScheduledExecutions} >= 0 AND ${table.totalChatExecutions} >= 0`
    ),
  })
)

export const customTools = pgTable('custom_tools', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  schema: json('schema').notNull(),
  code: text('code').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const subscription = pgTable('subscription', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  plan: text('plan').notNull(),
  referenceId: text('reference_id').notNull(),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  status: text('status'),
  periodStart: timestamp('period_start'),
  periodEnd: timestamp('period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end'),
  seats: integer('seats'),
  trialStart: timestamp('trial_start'),
  trialEnd: timestamp('trial_end'),
  metadata: json('metadata'),
})

export const organization = pgTable('organization', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  logo: text('logo'),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const member = pgTable('member', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const invitation = pgTable('invitation', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: text('email').notNull(),
  inviterId: uuid('inviter_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  status: text('status').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const workspace = pgTable(
  'workspace',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    name: text('name').notNull(),
    icon: text('icon'),
    color: text('color').notNull().default('#3972F6'),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    selectPolicy: pgPolicy('allow_members_read_workspace', {
      using: sql`(EXISTS (SELECT 1 FROM "workspace_member" WHERE "workspace_member"."workspace_id" = ${t.id} AND "workspace_member"."user_id" = auth.uid()))`,
      for: 'select',
      to: authenticatedRole,
    }),
    updatePolicy: pgPolicy('allow_members_update_workspace', {
      using: sql`(EXISTS (SELECT 1 FROM "workspace_member" WHERE "workspace_member"."workspace_id" = ${t.id} AND "workspace_member"."user_id" = auth.uid()))`,
      for: 'update',
      to: authenticatedRole,
    }),
  })
)

export const workspaceMember = pgTable(
  'workspace_member',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: workspaceMemberRoleEnum('role').notNull().default(WorkspaceMemberRole.MEMBER),
    joinedAt: timestamp('joined_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => {
    return {
      // Create index on userId for fast lookups of workspaces by user
      userIdIdx: uniqueIndex('user_workspace_idx').on(table.userId, table.workspaceId),
    }
  }
)

export const workspaceInvitation = pgTable('workspace_invitation', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspace.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  inviterId: uuid('inviter_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  role: workspaceMemberRoleEnum('role').notNull().default(WorkspaceMemberRole.MEMBER),
  status: text('status').notNull().default('pending'),
  token: text('token').notNull().unique(),
  permissions: permissionTypeEnum('permissions').notNull().default(PermissionType.ADMIN),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const memory = pgTable(
  'memory',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    workerId: uuid('worker_id').references(() => worker.id, {
      onDelete: 'cascade',
    }),
    key: text('key').notNull(), // Identifier for the memory within its context
    type: text('type').notNull(), // 'agent' or 'raw'
    data: json('data').notNull(), // Stores either agent message data or raw data
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => {
    return {
      // Add index on key for faster lookups
      keyIdx: index('memory_key_idx').on(table.key),

      // Add index on workerId for faster filtering
      workerIdx: index('memory_worker_idx').on(table.workerId),

      // Compound unique index to ensure keys are unique per worker
      uniqueKeyPerWorkerIdx: uniqueIndex('memory_worker_key_idx').on(table.workerId, table.key),
    }
  }
)

export const knowledgeBase = pgTable(
  'knowledge_base',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id').references(() => workspace.id, {
      onDelete: 'cascade',
    }),
    name: text('name').notNull(),
    description: text('description'),

    // Token tracking for usage
    tokenCount: integer('token_count').notNull().default(0),

    // Embedding configuration
    embeddingModel: text('embedding_model').notNull().default('text-embedding-3-small'),
    embeddingDimension: integer('embedding_dimension').notNull().default(1536),

    // Chunking configuration stored as JSON for flexibility
    chunkingConfig: json('chunking_config')
      .notNull()
      .default('{"maxSize": 1024, "minSize": 100, "overlap": 200}'),

    // Soft delete support
    deletedAt: timestamp('deleted_at'),

    // Metadata and timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // Primary access patterns
    userIdIdx: index('kb_user_id_idx').on(table.userId),
    workspaceIdIdx: index('kb_workspace_id_idx').on(table.workspaceId),
    // Composite index for user's workspaces
    userWorkspaceIdx: index('kb_user_workspace_idx').on(table.userId, table.workspaceId),
    // Index for soft delete filtering
    deletedAtIdx: index('kb_deleted_at_idx').on(table.deletedAt),
  })
)

export const document = pgTable(
  'document',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    knowledgeBaseId: uuid('knowledge_base_id')
      .notNull()
      .references(() => knowledgeBase.id, { onDelete: 'cascade' }),

    // File information
    filename: text('filename').notNull(),
    fileUrl: text('file_url').notNull(),
    fileSize: integer('file_size').notNull(), // Size in bytes
    mimeType: text('mime_type').notNull(), // e.g., 'application/pdf', 'text/plain'

    // Content statistics
    chunkCount: integer('chunk_count').notNull().default(0),
    tokenCount: integer('token_count').notNull().default(0),
    characterCount: integer('character_count').notNull().default(0),

    // Processing status
    processingStatus: processingStatusEnum('processing_status')
      .notNull()
      .default(ProcessingStatus.PENDING),
    processingStartedAt: timestamp('processing_started_at'),
    processingCompletedAt: timestamp('processing_completed_at'),
    processingError: text('processing_error'),

    // Document state
    enabled: boolean('enabled').notNull().default(true), // Enable/disable from knowledge base
    deletedAt: timestamp('deleted_at'), // Soft delete

    // Timestamps
    uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
  },
  (table) => ({
    // Primary access pattern - documents by knowledge base
    knowledgeBaseIdIdx: index('doc_kb_id_idx').on(table.knowledgeBaseId),
    // Search by filename (for search functionality)
    filenameIdx: index('doc_filename_idx').on(table.filename),
    // Order by upload date (for listing documents)
    kbUploadedAtIdx: index('doc_kb_uploaded_at_idx').on(table.knowledgeBaseId, table.uploadedAt),
    // Processing status filtering
    processingStatusIdx: index('doc_processing_status_idx').on(
      table.knowledgeBaseId,
      table.processingStatus
    ),
  })
)

export const embedding = pgTable(
  'embedding',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    knowledgeBaseId: uuid('knowledge_base_id')
      .notNull()
      .references(() => knowledgeBase.id, { onDelete: 'cascade' }),
    documentId: uuid('document_id')
      .notNull()
      .references(() => document.id, { onDelete: 'cascade' }),

    // Chunk information
    chunkIndex: integer('chunk_index').notNull(),
    chunkHash: text('chunk_hash').notNull(),
    content: text('content').notNull(),
    contentLength: integer('content_length').notNull(),
    tokenCount: integer('token_count').notNull(),

    // Vector embeddings - optimized for text-embedding-3-small with HNSW support
    embedding: vector('embedding', { dimensions: 1536 }), // For text-embedding-3-small
    embeddingModel: text('embedding_model').notNull().default('text-embedding-3-small'),

    // Chunk boundaries and overlap
    startOffset: integer('start_offset').notNull(),
    endOffset: integer('end_offset').notNull(),

    // Rich metadata for advanced filtering
    metadata: jsonb('metadata').notNull().default('{}'),

    // Chunk state - enable/disable from knowledge base
    enabled: boolean('enabled').notNull().default(true),

    // Full-text search support - generated tsvector column
    contentTsv: tsvector('content_tsv').generatedAlwaysAs(sql`to_tsvector('english', content)`),

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    // Primary vector search pattern
    kbIdIdx: index('emb_kb_id_idx').on(table.knowledgeBaseId),

    // Document-level access
    docIdIdx: index('emb_doc_id_idx').on(table.documentId),

    // Chunk ordering within documents
    docChunkIdx: uniqueIndex('emb_doc_chunk_idx').on(table.documentId, table.chunkIndex),

    // Model-specific queries for A/B testing or migrations
    kbModelIdx: index('emb_kb_model_idx').on(table.knowledgeBaseId, table.embeddingModel),

    // Enabled state filtering indexes (for chunk enable/disable functionality)
    kbEnabledIdx: index('emb_kb_enabled_idx').on(table.knowledgeBaseId, table.enabled),
    docEnabledIdx: index('emb_doc_enabled_idx').on(table.documentId, table.enabled),

    // Vector similarity search indexes (HNSW) - optimized for small embeddings
    embeddingVectorHnswIdx: index('embedding_vector_hnsw_idx')
      .using('hnsw', table.embedding.op('vector_cosine_ops'))
      .with({
        m: 16,
        ef_construction: 64,
      }),

    // GIN index for JSONB metadata queries
    metadataGinIdx: index('emb_metadata_gin_idx').using('gin', table.metadata.op('jsonb_ops')),

    // Full-text search index
    contentFtsIdx: index('emb_content_fts_idx').using('gin', table.contentTsv),

    // Data validation constraints
    embeddingNotNullCheck: check('embedding_not_null_check', sql`"embedding" IS NOT NULL`),
    contentLengthValid: check(
      'embedding_content_length_valid',
      sql`${table.contentLength} = length(${table.content})`
    ),
    chunkIndexPositive: check('embedding_chunk_index_positive', sql`${table.chunkIndex} >= 0`),
    tokenCountPositive: check('embedding_token_count_positive', sql`${table.tokenCount} >= 0`),
    offsetsValid: check(
      'embedding_offsets_valid',
      sql`${table.startOffset} >= 0 AND ${table.endOffset} > ${table.startOffset}`
    ),
  })
)

export const workerFolder = pgTable('worker_folder', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspace.id, { onDelete: 'cascade' }),
  parentId: text('parent_id'), // Self-reference - will be handled by relations
  color: text('color').default('#6B7280'),
  isExpanded: boolean('is_expanded').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const taskBlockOutput = pgTable(
  'task_block_output',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    taskActivityId: uuid('task_activity_id')
      .notNull()
      .references(() => taskActivity.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    blockId: text('block_id').notNull(), // Block ID from execution
    blockName: text('block_name'), // Block display name
    blockType: text('block_type').notNull(), // Block type (agent, api, function, etc.)
    executionId: text('execution_id').notNull(), // Execution session ID
    output: jsonb('output').notNull(), // Block output data
    input: jsonb('input'), // Block input data (optional)
    success: boolean('success').notNull().default(true),
    error: text('error'), // Error message if failed
    durationMs: integer('duration_ms').notNull().default(0), // Execution time in milliseconds
    startedAt: timestamp('started_at', { precision: 3, withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { precision: 3, withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('IX_task_block_output_task_activity_id').using(
      'btree',
      table.taskActivityId.asc().nullsLast().op('uuid_ops')
    ),
    index('IX_task_block_output_execution_id').using(
      'btree',
      table.executionId.asc().nullsLast().op('text_ops')
    ),
    index('IX_task_block_output_block_type').using(
      'btree',
      table.blockType.asc().nullsLast().op('text_ops')
    ),
    index('IX_task_block_output_block_id').on(table.blockId),
    index('IX_task_block_output_success').on(table.success),
    index('IX_task_block_output_duration').on(table.durationMs),
    index('IX_task_block_output_started_at').on(table.startedAt),
    // Composite indexes for performance
    index('IX_task_block_output_execution_type').on(table.executionId, table.blockType),
    index('IX_task_block_output_execution_success').on(table.executionId, table.success),
    // GIN indexes for JSON data
    index('IX_task_block_output_output_gin').using('gin', table.output.op('jsonb_ops')),
    index('IX_task_block_output_input_gin').using('gin', table.input.op('jsonb_ops')),
  ]
)

// Relations

export const workerRelations = relations(worker, ({ one, many }) => ({
  organization: one(organization, {
    fields: [worker.organizationId],
    references: [organization.id],
  }),
  workspace: one(workspace, {
    fields: [worker.workspaceId],
    references: [workspace.id],
  }),
  workerComments: many(workerComment),
  workerNotes: many(workerNote),
  assignedTasks: many(task, { relationName: 'assignee' }),
  favorites: many(favorite),
  workerActivities: many(workerActivity),
}))

export const workerCommentRelations = relations(workerComment, ({ one }) => ({
  worker: one(worker, {
    fields: [workerComment.workerId],
    references: [worker.id],
  }),
  user: one(user, {
    fields: [workerComment.userId],
    references: [user.id],
  }),
}))

export const favoriteRelations = relations(favorite, ({ one }) => ({
  worker: one(worker, {
    fields: [favorite.workerId],
    references: [worker.id],
  }),
  user: one(user, {
    fields: [favorite.userId],
    references: [user.id],
  }),
}))

export const taskRelations = relations(task, ({ one, many }) => ({
  workspace: one(workspace, {
    fields: [task.workspaceId],
    references: [workspace.id],
  }),
  project: one(project, {
    fields: [task.projectId],
    references: [project.id],
  }),
  assignee: one(worker, {
    fields: [task.assigneeId],
    references: [worker.id],
    relationName: 'assignee',
  }),
  comments: many(taskComment),
  activities: many(taskActivity),
  taskToTaskTags: many(taskToTaskTag),
}))

export const taskActivityRelations = relations(taskActivity, ({ one, many }) => ({
  task: one(task, {
    fields: [taskActivity.taskId],
    references: [task.id],
  }),
  blockOutputs: many(taskBlockOutput),
}))

export const taskBlockOutputRelations = relations(taskBlockOutput, ({ one }) => ({
  taskActivity: one(taskActivity, {
    fields: [taskBlockOutput.taskActivityId],
    references: [taskActivity.id],
  }),
}))

export const projectRelations = relations(project, ({ one, many }) => ({
  workspace: one(workspace, {
    fields: [project.workspaceId],
    references: [workspace.id],
  }),
  createdBy: one(user, {
    fields: [project.createdBy],
    references: [user.id],
  }),
  tasks: many(task),
  notes: many(projectNote),
  activities: many(projectActivity),
  projectToProjectTags: many(projectToProjectTag),
}))

export const projectNoteRelations = relations(projectNote, ({ one }) => ({
  project: one(project, {
    fields: [projectNote.projectId],
    references: [project.id],
  }),
  user: one(user, {
    fields: [projectNote.userId],
    references: [user.id],
  }),
}))

export const projectActivityRelations = relations(projectActivity, ({ one }) => ({
  project: one(project, {
    fields: [projectActivity.projectId],
    references: [project.id],
  }),
}))

export const workerFolderRelations = relations(workerFolder, ({ one, many }) => ({
  user: one(user, {
    fields: [workerFolder.userId],
    references: [user.id],
  }),
  workspace: one(workspace, {
    fields: [workerFolder.workspaceId],
    references: [workspace.id],
  }),
  parent: one(workerFolder, {
    fields: [workerFolder.parentId],
    references: [workerFolder.id],
    relationName: 'parent',
  }),
  children: many(workerFolder, {
    relationName: 'parent',
  }),
  workers: many(worker),
}))

export const workerExecutionSnapshots = pgTable(
  'worker_execution_snapshots',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    workerId: uuid('worker_id')
      .notNull()
      .references(() => worker.id, { onDelete: 'cascade' }),
    stateHash: text('state_hash').notNull(),
    stateData: jsonb('state_data').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    workerIdIdx: index('worker_snapshots_worker_id_idx').on(table.workerId),
    stateHashIdx: index('worker_snapshots_hash_idx').on(table.stateHash),
    workerHashUnique: uniqueIndex('worker_snapshots_worker_hash_idx').on(
      table.workerId,
      table.stateHash
    ),
    createdAtIdx: index('worker_snapshots_created_at_idx').on(table.createdAt),
  })
)

export const workerExecutionLogs = pgTable(
  'worker_execution_logs',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    workerId: uuid('worker_id')
      .notNull()
      .references(() => worker.id, { onDelete: 'cascade' }),
    executionId: text('execution_id').notNull(),
    stateSnapshotId: uuid('state_snapshot_id')
      .notNull()
      .references(() => workerExecutionSnapshots.id),

    level: text('level').notNull(), // 'info', 'error'
    message: text('message').notNull(),
    trigger: text('trigger').notNull(), // 'api', 'webhook', 'schedule', 'manual', 'chat'

    startedAt: timestamp('started_at').notNull(),
    endedAt: timestamp('ended_at'),
    totalDurationMs: integer('total_duration_ms'),

    blockCount: integer('block_count').notNull().default(0),
    successCount: integer('success_count').notNull().default(0),
    errorCount: integer('error_count').notNull().default(0),
    skippedCount: integer('skipped_count').notNull().default(0),

    totalCost: decimal('total_cost', { precision: 10, scale: 6 }),
    totalInputCost: decimal('total_input_cost', { precision: 10, scale: 6 }),
    totalOutputCost: decimal('total_output_cost', { precision: 10, scale: 6 }),
    totalTokens: integer('total_tokens'),

    metadata: jsonb('metadata').notNull().default('{}'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    workerIdIdx: index('worker_execution_logs_worker_id_idx').on(table.workerId),
    executionIdIdx: index('worker_execution_logs_execution_id_idx').on(table.executionId),
    triggerIdx: index('worker_execution_logs_trigger_idx').on(table.trigger),
    levelIdx: index('worker_execution_logs_level_idx').on(table.level),
    startedAtIdx: index('worker_execution_logs_started_at_idx').on(table.startedAt),
    costIdx: index('worker_execution_logs_cost_idx').on(table.totalCost),
    durationIdx: index('worker_execution_logs_duration_idx').on(table.totalDurationMs),
    executionIdUnique: uniqueIndex('worker_execution_logs_execution_id_unique').on(
      table.executionId
    ),
  })
)

export const workerExecutionBlocks = pgTable(
  'worker_execution_blocks',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    executionId: text('execution_id').notNull(),
    workerId: uuid('worker_id')
      .notNull()
      .references(() => worker.id, { onDelete: 'cascade' }),
    blockId: text('block_id').notNull(),
    blockName: text('block_name'),
    blockType: text('block_type').notNull(),

    startedAt: timestamp('started_at').notNull(),
    endedAt: timestamp('ended_at'),
    durationMs: integer('duration_ms'),

    status: text('status').notNull(), // 'success', 'error', 'skipped'
    errorMessage: text('error_message'),
    errorStackTrace: text('error_stack_trace'),

    inputData: jsonb('input_data'),
    outputData: jsonb('output_data'),

    costInput: decimal('cost_input', { precision: 10, scale: 6 }),
    costOutput: decimal('cost_output', { precision: 10, scale: 6 }),
    costTotal: decimal('cost_total', { precision: 10, scale: 6 }),
    tokensPrompt: integer('tokens_prompt'),
    tokensCompletion: integer('tokens_completion'),
    tokensTotal: integer('tokens_total'),
    modelUsed: text('model_used'),

    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    executionIdIdx: index('execution_blocks_execution_id_idx').on(table.executionId),
    workerIdIdx: index('execution_blocks_worker_id_idx').on(table.workerId),
    blockIdIdx: index('execution_blocks_block_id_idx').on(table.blockId),
    statusIdx: index('execution_blocks_status_idx').on(table.status),
    durationIdx: index('execution_blocks_duration_idx').on(table.durationMs),
    costIdx: index('execution_blocks_cost_idx').on(table.costTotal),
    workerExecutionIdx: index('execution_blocks_worker_execution_idx').on(
      table.workerId,
      table.executionId
    ),
    executionStatusIdx: index('execution_blocks_execution_status_idx').on(
      table.executionId,
      table.status
    ),
    startedAtIdx: index('execution_blocks_started_at_idx').on(table.startedAt),
  })
)

// Export types for all tables
export type User = typeof user.$inferSelect
export type UserInsert = typeof user.$inferInsert

export type Session = typeof session.$inferSelect
export type SessionInsert = typeof session.$inferInsert

export type Account = typeof account.$inferSelect
export type AccountInsert = typeof account.$inferInsert

export type Verification = typeof verification.$inferSelect
export type VerificationInsert = typeof verification.$inferInsert

export type WorkerLog = typeof workerLogs.$inferSelect
export type WorkerLogInsert = typeof workerLogs.$inferInsert

export type Environment = typeof environment.$inferSelect
export type EnvironmentInsert = typeof environment.$inferInsert

export type Settings = typeof settings.$inferSelect
export type SettingsInsert = typeof settings.$inferInsert

export type WorkerSchedule = typeof workerSchedule.$inferSelect
export type WorkerScheduleInsert = typeof workerSchedule.$inferInsert

export type Webhook = typeof webhook.$inferSelect
export type WebhookInsert = typeof webhook.$inferInsert

export type ApiKey = typeof apiKey.$inferSelect
export type ApiKeyInsert = typeof apiKey.$inferInsert

export type Marketplace = typeof marketplace.$inferSelect
export type MarketplaceInsert = typeof marketplace.$inferInsert

export type UserStats = typeof userStats.$inferSelect
export type UserStatsInsert = typeof userStats.$inferInsert

export type CustomTool = typeof customTools.$inferSelect
export type CustomToolInsert = typeof customTools.$inferInsert

export type Subscription = typeof subscription.$inferSelect
export type SubscriptionInsert = typeof subscription.$inferInsert

export type Organization = typeof organization.$inferSelect
export type OrganizationInsert = typeof organization.$inferInsert

export type Member = typeof member.$inferSelect
export type MemberInsert = typeof member.$inferInsert

export type Invitation = typeof invitation.$inferSelect
export type InvitationInsert = typeof invitation.$inferInsert

export type Workspace = typeof workspace.$inferSelect
export type WorkspaceInsert = typeof workspace.$inferInsert

export type WorkspaceMember = typeof workspaceMember.$inferSelect
export type WorkspaceMemberInsert = typeof workspaceMember.$inferInsert

export type WorkspaceInvitation = typeof workspaceInvitation.$inferSelect
export type WorkspaceInvitationInsert = typeof workspaceInvitation.$inferInsert

export type Memory = typeof memory.$inferSelect
export type MemoryInsert = typeof memory.$inferInsert

export type Worker = typeof worker.$inferSelect
export type WorkerInsert = typeof worker.$inferInsert

export type WorkerComment = typeof workerComment.$inferSelect
export type WorkerCommentInsert = typeof workerComment.$inferInsert

export type WorkerNote = typeof workerNote.$inferSelect
export type WorkerNoteInsert = typeof workerNote.$inferInsert

export type WorkerActivity = typeof workerActivity.$inferSelect
export type WorkerActivityInsert = typeof workerActivity.$inferInsert

export type Project = typeof project.$inferSelect
export type ProjectInsert = typeof project.$inferInsert

export type ProjectTag = typeof projectTag.$inferSelect
export type ProjectTagInsert = typeof projectTag.$inferInsert

export type ProjectNote = typeof projectNote.$inferSelect
export type ProjectNoteInsert = typeof projectNote.$inferInsert

export type ProjectActivity = typeof projectActivity.$inferSelect
export type ProjectActivityInsert = typeof projectActivity.$inferInsert

export type Task = typeof task.$inferSelect
export type TaskInsert = typeof task.$inferInsert

export type TaskComment = typeof taskComment.$inferSelect
export type TaskCommentInsert = typeof taskComment.$inferInsert

export type Favorite = typeof favorite.$inferSelect
export type FavoriteInsert = typeof favorite.$inferInsert

export type Chat = typeof chat.$inferSelect
export type ChatInsert = typeof chat.$inferInsert

export type Message = typeof message.$inferSelect
export type MessageInsert = typeof message.$inferInsert

export type Vote = typeof vote.$inferSelect
export type VoteInsert = typeof vote.$inferInsert

export type Suggestion = typeof suggestion.$inferSelect
export type SuggestionInsert = typeof suggestion.$inferInsert

export type ArtifactDocument = typeof artifactDocument.$inferSelect
export type ArtifactDocumentInsert = typeof artifactDocument.$inferInsert

export type Stream = typeof stream.$inferSelect
export type StreamInsert = typeof stream.$inferInsert

export type WorkerFolder = typeof workerFolder.$inferSelect
export type WorkerFolderInsert = typeof workerFolder.$inferInsert

export type TaskBlockOutput = typeof taskBlockOutput.$inferSelect
export type TaskBlockOutputInsert = typeof taskBlockOutput.$inferInsert
