import { relations } from 'drizzle-orm';
import {
  boolean,
  customType,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';


// Custom Types
export const bytea = customType<{
  data: Buffer | null;
  notNull: false;
  default: false;
}>({
  dataType() {
    return 'bytea';
  },
  toDriver(val: Buffer | null) {
    return val;
  },
  fromDriver(value: unknown) {
    if (value === null) {
      return null;
    }

    if (value instanceof Buffer) {
      return value;
    }

    if (typeof value === 'string') {
      return Buffer.from(value, 'hex');
    }

    throw new Error(`Unexpected type received from driver: ${typeof value}`);
  }
});

// Enums
export enum ActionType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete'
}

export enum ActorType {
  SYSTEM = 'system',
  MEMBER = 'member',
  API = 'api'
}

export enum DocumentRecord {
  PERSON = 'person',
  COMPANY = 'company'
}

export enum DocumentStage {
  LEAD = 'lead',
  QUALIFIED = 'qualified',
  OPPORTUNITY = 'opportunity',
  PROPOSAL = 'proposal',
  IN_NEGOTIATION = 'inNegotiation',
  LOST = 'lost',
  WON = 'won'
}

export enum DocumentTaskStatus {
  OPEN = 'open',
  COMPLETED = 'completed'
}

export enum DayOfWeek {
  SUNDAY = 'sunday',
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday'
}

export enum FeedbackCategory {
  SUGGESTION = 'suggestion',
  PROBLEM = 'problem',
  QUESTION = 'question'
}

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REVOKED = 'revoked'
}

export enum Role {
  MEMBER = 'member',
  ADMIN = 'admin'
}

export enum WebhookTrigger {
  document_CREATED = 'documentCreated',
  document_UPDATED = 'documentUpdated',
  document_DELETED = 'documentDeleted'
}

function enumToPgEnum<T extends Record<string, string>>(myEnum: T) {
  return Object.values(myEnum).map((value) => `${value}`) as [
    T[keyof T],
    ...T[keyof T][]
  ];
}

// use lowercase: https://github.com/drizzle-team/drizzle-orm/issues/1564#issuecomment-2320605690

export const actionTypeEnum = pgEnum('actiontype', enumToPgEnum(ActionType));
export const actorTypeEnum = pgEnum('actortype', enumToPgEnum(ActorType));
export const documentRecordEnum = pgEnum(
  'documentrecord',
  enumToPgEnum(DocumentRecord)
);
export const documentStageEnum = pgEnum(
  'documentstage',
  enumToPgEnum(DocumentStage)
);
export const documentTaskStatusEnum = pgEnum(
  'documenttaskstatus',
  enumToPgEnum(DocumentTaskStatus)
);
export const dayOfWeekEnum = pgEnum('dayofweek', enumToPgEnum(DayOfWeek));
export const feedbackCategoryEnum = pgEnum(
  'feedbackcategory',
  enumToPgEnum(FeedbackCategory)
);
export const invitationStatusEnum = pgEnum(
  'invitationstatus',
  enumToPgEnum(InvitationStatus)
);
export const roleEnum = pgEnum('Role', enumToPgEnum(Role));
export const webhookTriggerEnum = pgEnum(
  'webhooktrigger',
  enumToPgEnum(WebhookTrigger)
);

// Tables

export const apiKeyTable = pgTable(
  'apiKey',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    organizationId: uuid('organizationId')
      .notNull()
      .references(() => organizationTable.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade'
      }),
    description: varchar('description', { length: 70 }).notNull(),
    hashedKey: text('hashedKey').notNull(),
    expiresAt: timestamp('expiresAt', { precision: 3, mode: 'date' }),
    lastUsedAt: timestamp('lastUsedAt', { precision: 3, mode: 'date' }),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date())
  },
  (table) => [
    uniqueIndex('IX_apiKey_hashedKey_unique').using(
      'btree',
      table.hashedKey.asc().nullsLast().op('text_ops')
    ),
    index('IX_apiKey_organizationId').using(
      'btree',
      table.organizationId.asc().nullsLast().op('uuid_ops')
    )
  ]
);

export const authenticatorAppTable = pgTable(
  'authenticatorApp',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('userId')
      .notNull()
      .references(() => userTable.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade'
      }),
    accountName: varchar('accountName', { length: 255 }).notNull(),
    issuer: varchar('issuer', { length: 255 }).notNull(),
    secret: varchar('secret', { length: 255 }).notNull(),
    recoveryCodes: varchar('recoveryCodes', { length: 1024 }).notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date())
  },
  (table) => [
    uniqueIndex('IX_authenticatorApp_userId_unique').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops')
    )
  ]
);

export const changeEmailRequestTable = pgTable(
  'changeEmailRequest',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('userId')
      .notNull()
      .references(() => userTable.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade'
      }),
    email: text('email').notNull(),
    expires: timestamp('expires', { precision: 3, mode: 'date' }).notNull(),
    valid: boolean('valid').default(false).notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date())
  },
  (table) => [
    index('IX_changeEmailRequest_userId').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops')
    )
  ]
);

export const documentTable = pgTable(
  'document',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    organizationId: uuid('organizationId')
      .notNull()
      .references(() => organizationTable.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade'
      }),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
    address: varchar('address', { length: 255 }),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    image: varchar('image', { length: 2048 }),
    stage: documentStageEnum('stage').default(DocumentStage.LEAD).notNull(),
    phone: varchar('phone', { length: 32 }),
    record: documentRecordEnum('record').default(DocumentRecord.PERSON).notNull()
  },
  (table) => [
    index('IX_document_organizationId').using(
      'btree',
      table.organizationId.asc().nullsLast().op('uuid_ops')
    )
  ]
);

export const documentCommentTable = pgTable(
  'documentComment',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    documentId: uuid('documentId')
      .notNull()
      .references(() => documentTable.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade'
      }),
    userId: uuid('userId')
      .notNull()
      .references(() => userTable.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade'
      }),
    text: varchar('text', { length: 2000 }).notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date())
  },
  (table) => [
    index('IX_documentComment_documentId').using(
      'btree',
      table.documentId.asc().nullsLast().op('uuid_ops')
    ),
    index('IX_documentComment_userId').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops')
    )
  ]
);

export const documentNoteTable = pgTable(
  'documentNote',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    documentId: uuid('documentId')
      .notNull()
      .references(() => documentTable.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade'
      }),
    userId: uuid('userId')
      .notNull()
      .references(() => userTable.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade'
      }),
    text: varchar('text', { length: 8000 }),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date())
  },
  (table) => [
    index('IX_documentNote_documentId').using(
      'btree',
      table.documentId.asc().nullsLast().op('uuid_ops')
    ),
    index('IX_documentNote_userId').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops')
    )
  ]
);

export const documentPageVisitTable = pgTable(
  'documentPageVisit',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    documentId: uuid('documentId')
      .notNull()
      .references(() => documentTable.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade'
      }),
    timestamp: timestamp('timestamp', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull(),
    userId: uuid('userId').references(() => userTable.id, {
      onDelete: 'set null',
      onUpdate: 'cascade'
    })
  },
  (table) => [
    index('IX_documentPageVisit_documentId').using(
      'btree',
      table.documentId.asc().nullsLast().op('uuid_ops')
    ),
    index('IX_documentPageVisit_userId').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops')
    )
  ]
);

export const documentImageTable = pgTable(
  'documentImage',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    documentId: uuid('documentId')
      .notNull()
      .references(() => documentTable.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade'
      }),
    data: bytea('data'),
    contentType: varchar('contentType', { length: 255 }),
    hash: varchar('hash', { length: 64 })
  },
  (table) => [
    index('IX_documentImage_documentId').using(
      'btree',
      table.documentId.asc().nullsLast().op('uuid_ops')
    )
  ]
);

export const documentTaskTable = pgTable(
  'documentTask',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    documentId: uuid('documentId')
      .notNull()
      .references(() => documentTable.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade'
      }),
    title: varchar('title', { length: 255 }).notNull(),
    description: varchar('description', { length: 8000 }),
    status: documentTaskStatusEnum('status')
      .default(DocumentTaskStatus.OPEN)
      .notNull(),
    dueDate: timestamp('dueDate', { precision: 3, mode: 'date' }),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date())
  },
  (table) => [
    index('IX_documentTask_documentId').using(
      'btree',
      table.documentId.asc().nullsLast().op('uuid_ops')
    )
  ]
);

export const favoriteTable = pgTable(
  'favorite',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('userId')
      .notNull()
      .references(() => userTable.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade'
      }),
    documentId: uuid('documentId')
      .notNull()
      .references(() => documentTable.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade'
      }),
    order: integer('order').default(0).notNull()
  },
  (table) => [
    index('IX_favorite_documentId').using(
      'btree',
      table.documentId.asc().nullsLast().op('uuid_ops')
    ),
    index('IX_favorite_userId').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops')
    )
  ]
);

export const invitationTable = pgTable(
  'invitation',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    organizationId: uuid('organizationId')
      .notNull()
      .references(() => organizationTable.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade'
      }),
    token: uuid('token').notNull().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull(),
    role: roleEnum('role').default(Role.MEMBER).notNull(),
    status: invitationStatusEnum('status')
      .default(InvitationStatus.PENDING)
      .notNull(),
    inviterId: uuid('inviterId')
      .notNull()
      .references(() => userTable.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade'
      }),
    expiresAt: timestamp('expiresAt', { precision: 3, mode: 'date' }).notNull(),
    metadata: text('metadata'),
    lastSentAt: timestamp('lastSentAt', { precision: 3, mode: 'date' }),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date())
  },
  (table) => [
    index('IX_invitation_organizationId').using(
      'btree',
      table.organizationId.asc().nullsLast().op('uuid_ops')
    ),
    index('IX_invitation_token').using(
      'btree',
      table.token.asc().nullsLast().op('uuid_ops')
    )
  ]
);

export const documentTagTable = pgTable(
  'documentTag',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    text: varchar('text', { length: 128 }).notNull()
  },
  (table) => [
    uniqueIndex('IX_documentTag_text_unique').using(
      'btree',
      table.text.asc().nullsLast().op('text_ops')
    )
  ]
);

export const accountTable = pgTable(
  'account',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('userId')
      .notNull()
      .references(() => userTable.id, { onDelete: 'cascade' }),
    accountId: text('accountId').notNull(),
    providerId: text('providerId').notNull(),
    refreshToken: text('refreshToken'),
    accessToken: text('accessToken'),
    accessTokenExpiresAt: timestamp('accessTokenExpiresAt', { mode: 'date' }),
    refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt', { mode: 'date' }),
    scope: text('scope'),
    idToken: text('idToken'),
    password: text('password'),
    metadata: text('metadata'),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date())
  },
  (table) => [
    uniqueIndex('IX_account_providerId_accountId_unique').using(
      'btree',
      table.providerId.asc().nullsLast().op('text_ops'),
      table.accountId.asc().nullsLast().op('text_ops')
    ),
    index('IX_account_userId').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops')
    )
  ]
);

export const feedbackTable = pgTable(
  'feedback',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    organizationId: uuid('organizationId')
      .notNull()
      .references(() => organizationTable.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade'
      }),
    userId: uuid('userId').references(() => userTable.id, {
      onDelete: 'set null',
      onUpdate: 'cascade'
    }),
    category: feedbackCategoryEnum('category')
      .default(FeedbackCategory.SUGGESTION)
      .notNull(),
    message: varchar('message', { length: 4000 }).notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date())
  },
  (table) => [
    index('IX_feedback_organizationId').using(
      'btree',
      table.organizationId.asc().nullsLast().op('uuid_ops')
    ),
    index('IX_feedback_userId').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops')
    )
  ]
);

export const notificationTable = pgTable(
  'notification',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('userId')
      .notNull()
      .references(() => userTable.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade'
      }),
    subject: varchar('subject', { length: 128 }),
    content: varchar('content', { length: 8000 }).notNull(),
    link: varchar('link', { length: 2000 }),
    seenAt: timestamp('seenAt', { precision: 3, mode: 'date' }),
    dismissed: boolean('dismissed').default(false).notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date())
  },
  (table) => [
    index('IX_notification_userId').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops')
    )
  ]
);

export const resetPasswordRequestTable = pgTable(
  'resetPasswordRequest',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    email: text('email').notNull(),
    expires: timestamp('expires', { precision: 3, mode: 'date' }).notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date())
  },
  (table) => [
    index('IX_resetPasswordRequest_email').using(
      'btree',
      table.email.asc().nullsLast().op('text_ops')
    )
  ]
);

export const userImageTable = pgTable(
  'userImage',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    userId: uuid('userId')
      .notNull()
      .references(() => userTable.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade'
      }),
    data: bytea('data'),
    contentType: varchar('contentType', { length: 255 }),
    hash: varchar('hash', { length: 64 })
  },
  (table) => [
    index('IX_userImage_userId').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops')
    )
  ]
);

export const userTable = pgTable(
  'user',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    email: text('email').unique().notNull(),
    emailVerified: boolean('emailVerified').notNull().default(false),
    password: text('password'),
    lastLogin: timestamp('lastLogin', { precision: 3, mode: 'date' }),
    locale: varchar('locale', { length: 8 }).default('en-US').notNull(),
    completedOnboarding: boolean('completedOnboarding')
      .default(false)
      .notNull(),
    enabledDocumentsNotifications: boolean('enabledDocumentsNotifications')
      .default(false)
      .notNull(),
    enabledInboxNotifications: boolean('enabledInboxNotifications')
      .default(false)
      .notNull(),
    twoFactorEnabled: boolean('twoFactorEnabled').default(false),
    activeOrganizationId: uuid('activeOrganizationId').references(
      () => organizationTable.id,
      {
        onDelete: 'set null'
      }
    ),
    enabledNewsletter: boolean('enabledNewsletter').default(false).notNull(),
    enabledProductUpdates: boolean('enabledProductUpdates')
      .default(false)
      .notNull(),
    enabledWeeklySummary: boolean('enabledWeeklySummary')
      .default(false)
      .notNull(),
    image: varchar('image', { length: 2048 }),
    name: varchar('name', { length: 64 }).notNull(),
    phone: varchar('phone', { length: 32 }),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date())
  },
  (table) => [
    uniqueIndex('IX_user_email_unique').using(
      'btree',
      table.email.asc().nullsLast().op('text_ops')
    ),
    index('IX_user_name').using(
      'btree',
      table.name.asc().nullsLast().op('text_ops')
    )
  ]
);

export const sessionTable = pgTable(
  'session',
  {
    token: text('token').primaryKey(),
    userId: uuid('userId')
      .notNull()
      .references(() => userTable.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expiresAt', { mode: 'date' }).notNull(),
    ipAddress: text('ipAddress'),
    userAgent: text('userAgent'),
    metadata: text('metadata'),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date())
  },
  (table) => [
    index('IX_session_userId').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops')
    )
  ]
);

export const verificationTable = pgTable(
  'verification',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expiresAt', { precision: 3, mode: 'date' }).notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date())
  },
  (table) => [
    uniqueIndex('IX_verification_identifier_unique').using(
      'btree',
      table.identifier.asc().nullsLast().op('text_ops'),
      table.value.asc().nullsLast().op('text_ops')
    )
  ]
);

export const workHoursTable = pgTable(
  'workHours',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    organizationId: uuid('organizationId')
      .notNull()
      .references(() => organizationTable.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade'
      }),
    dayOfWeek: dayOfWeekEnum('dayOfWeek').default(DayOfWeek.SUNDAY).notNull()
  },
  (table) => [
    index('IX_workHours_organizationId').using(
      'btree',
      table.organizationId.asc().nullsLast().op('uuid_ops')
    )
  ]
);

export const workTimeSlotTable = pgTable(
  'workTimeSlot',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    workHoursId: uuid('workHoursId')
      .notNull()
      .references(() => workHoursTable.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade'
      }),
    start: timestamp('start', { precision: 2, withTimezone: false }).notNull(),
    end: timestamp('end', { precision: 2, withTimezone: false }).notNull()
  },
  (table) => [
    index('IX_workTimeSlot_workHoursId').using(
      'btree',
      table.workHoursId.asc().nullsLast().op('uuid_ops')
    )
  ]
);

export const documentActivityTable = pgTable(
  'documentActivity',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    documentId: uuid('documentId')
      .notNull()
      .references(() => documentTable.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade'
      }),
    actionType: actionTypeEnum('actionType').notNull(),
    actorId: varchar('actorId', { length: 255 }).notNull(),
    actorType: actorTypeEnum('actorType').notNull(),
    metadata: jsonb('metadata'),
    occurredAt: timestamp('occurredAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull()
  },
  (table) => [
    index('IX_documentActivity_documentId').using(
      'btree',
      table.documentId.asc().nullsLast().op('uuid_ops')
    ),
    index('IX_documentActivity_occurredAt').using(
      'btree',
      table.occurredAt.asc().nullsLast().op('timestamp_ops')
    )
  ]
);

export const webhookTable = pgTable(
  'webhook',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    organizationId: uuid('organizationId')
      .notNull()
      .references(() => organizationTable.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade'
      }),
    secret: varchar('secret', { length: 1024 }),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull(),
    triggers: webhookTriggerEnum('triggers').array().notNull(),
    url: varchar('url', { length: 2000 }).notNull()
  },
  (table) => [
    {
      organizationIdIndex: index('IX_webhook_organizationId').on(
        table.organizationId
      )
    }
  ]
);

export const membershipTable = pgTable(
  'membership',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    organizationId: uuid('organizationId')
      .notNull()
      .references(() => organizationTable.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade'
      }),
    userId: uuid('userId')
      .notNull()
      .references(() => userTable.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade'
      }),
    role: roleEnum('role').default(Role.MEMBER).notNull(),
    isOwner: boolean('isOwner').default(false).notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull(),
    metadata: text('metadata')
  },
  (table) => [
    uniqueIndex('IX_membership_organizationId_userId_unique').using(
      'btree',
      table.organizationId.asc().nullsLast().op('uuid_ops'),
      table.userId.asc().nullsLast().op('uuid_ops')
    ),
    index('IX_membership_userId').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops')
    ),
    index('IX_membership_organizationId').using(
      'btree',
      table.organizationId.asc().nullsLast().op('uuid_ops')
    )
  ]
);

export const organizationLogoTable = pgTable(
  'organizationLogo',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    organizationId: uuid('organizationId')
      .notNull()
      .references(() => organizationTable.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade'
      }),
    data: bytea('data'),
    contentType: varchar('contentType', { length: 255 }),
    hash: varchar('hash', { length: 64 })
  },
  (table) => [
    index('IX_organizationLogo_organizationId').using(
      'btree',
      table.organizationId.asc().nullsLast().op('uuid_ops')
    )
  ]
);

export const organizationTable = pgTable(
  'organization',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    address: varchar('address', { length: 255 }),
    email: varchar('email', { length: 255 }),
    website: varchar('website', { length: 2000 }),
    phone: varchar('phone', { length: 32 }),
    facebookPage: varchar('facebookPage', { length: 2000 }),
    instagramProfile: varchar('instagramProfile', { length: 2000 }),
    linkedInProfile: varchar('linkedInProfile', { length: 2000 }),
    tikTokProfile: varchar('tikTokProfile', { length: 2000 }),
    xProfile: varchar('xProfile', { length: 2000 }),
    youTubeChannel: varchar('youTubeChannel', { length: 2000 }),
    logo: varchar('logo', { length: 2048 }),
    slug: varchar('slug', { length: 255 }).notNull(),
    billingCustomerId: varchar('billingCustomerId', { length: 255 }),
    billingEmail: varchar('billingEmail', { length: 255 }),
    billingLine1: varchar('billingLine1', { length: 255 }),
    billingLine2: varchar('billingLine2', { length: 255 }),
    billingCountry: varchar('billingCountry', { length: 3 }),
    billingPostalCode: varchar('billingPostalCode', { length: 16 }),
    billingCity: varchar('billingCity', { length: 255 }),
    billingState: varchar('billingState', { length: 255 }),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'date' })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    metadata: text('metadata')
  },
  (table) => [
    index('IX_organization_billingCustomerId').using(
      'btree',
      table.billingCustomerId.asc().nullsLast().op('text_ops')
    ),
    uniqueIndex('IX_organization_slug_unique').using(
      'btree',
      table.slug.asc().nullsLast().op('text_ops')
    )
  ]
);

export const subscriptionTable = pgTable('subscription', {
  id: text('id').primaryKey(),
  organizationId: uuid('organizationId').notNull(),
  status: varchar('status', { length: 64 }).notNull(),
  active: boolean('active').notNull().default(false),
  provider: varchar('provider', { length: 32 }).notNull(),
  cancelAtPeriodEnd: boolean('cancelAtPeriodEnd').notNull().default(false),
  currency: varchar('currency', { length: 3 }).notNull(),
  periodStartsAt: timestamp('periodStartsAt', { withTimezone: true, precision: 6 }).notNull(),
  periodEndsAt: timestamp('periodEndsAt', { withTimezone: true, precision: 6 }).notNull(),
  trialStartsAt: timestamp('trialStartsAt', { withTimezone: true, precision: 6 }),
  trialEndsAt: timestamp('trialEndsAt', { withTimezone: true, precision: 6 }),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('IX_subscription_organizationId').using(
    'btree',
    table.organizationId.asc().nullsLast().op('uuid_ops')
  )
]);

export const subscriptionItemTable = pgTable('subscriptionItem', {
  id: text('id').primaryKey(),
  subscriptionId: text('subscriptionId').notNull(),
  quantity: integer('quantity').notNull(),
  productId: text('productId').notNull(),
  variantId: text('variantId').notNull(),
  priceAmount: doublePrecision('priceAmount'),
  interval: text('interval').notNull(),
  intervalCount: integer('intervalCount').notNull(),
  type: text('type'),
  model: text('model'),
}, (table) => [
  index('IX_subscriptionItem_subscriptionId').using(
    'btree',
    table.subscriptionId.asc().nullsLast()
  )
]);

export const orderTable = pgTable('order', {
  id: text('id').primaryKey(),
  organizationId: uuid('organizationId').notNull(),
  status: varchar('status', { length: 64 }).notNull(),
  provider: varchar('provider', { length: 32 }).notNull(),
  totalAmount: doublePrecision('totalAmount').notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
},
  (table) => [
    index('IX_order_organizationId').using(
      'btree',
      table.organizationId.asc().nullsLast().op('uuid_ops')
    )
  ]);

export const orderItemTable = pgTable('orderItem', {
  id: text('id').primaryKey(),
  orderId: text('orderId').notNull(),
  quantity: integer('quantity').notNull(),
  productId: text('productId').notNull(),
  variantId: text('variantId').notNull(),
  priceAmount: doublePrecision('priceAmount'),
  type: text('type'),
  model: text('model'),
},
  (table) => [
    index('IX_orderItem_orderId').using(
      'btree',
      table.orderId.asc().nullsLast()
    )
  ]);

export const documentToDocumentTagTable = pgTable(
  'documentToDocumentTag',
  {
    documentId: uuid('documentId')
      .notNull()
      .references(() => documentTable.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade'
      }),
    documentTagId: uuid('documentTagId')
      .notNull()
      .references(() => documentTagTable.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade'
      })
  },
  (table) => [
    {
      pk: primaryKey({
        columns: [table.documentId, table.documentTagId]
      }),
      documentIdIdx: index('IX_documentToDocumentTag_documentId').on(
        table.documentId
      ),
      documentTagIdIdx: index('IX_documentToDocumentTag_documentTagId').on(
        table.documentTagId
      )
    }
  ]
);

// Relations
export const apiKeyRelations = relations(apiKeyTable, ({ one }) => ({
  organization: one(organizationTable, {
    fields: [apiKeyTable.organizationId],
    references: [organizationTable.id],
  }),
}));


export const organizationRelations = relations(
  organizationTable,
  ({ many }) => ({
    apiKeys: many(apiKeyTable),
    documents: many(documentTable),
    invitations: many(invitationTable),
    feedbacks: many(feedbackTable),
    workHours: many(workHoursTable),
    webhooks: many(webhookTable),
    memberships: many(membershipTable)
  })
);

export const authenticatorAppRelations = relations(
  authenticatorAppTable,
  ({ one }) => ({
    user: one(userTable, {
      fields: [authenticatorAppTable.userId],
      references: [userTable.id]
    })
  })
);

export const userRelations = relations(userTable, ({ many }) => ({
  authenticatorApps: many(authenticatorAppTable),
  changeEmailRequests: many(changeEmailRequestTable),
  documentComments: many(documentCommentTable),
  documentNotes: many(documentNoteTable),
  documentPageVisits: many(documentPageVisitTable),
  favorites: many(favoriteTable),
  accounts: many(accountTable),
  feedbacks: many(feedbackTable),
  notifications: many(notificationTable),
  sessions: many(sessionTable),
  memberships: many(membershipTable)
}));

export const changeEmailRequestRelations = relations(
  changeEmailRequestTable,
  ({ one }) => ({
    user: one(userTable, {
      fields: [changeEmailRequestTable.userId],
      references: [userTable.id]
    })
  })
);

export const documentRelations = relations(documentTable, ({ one, many }) => ({
  organization: one(organizationTable, {
    fields: [documentTable.organizationId],
    references: [organizationTable.id],
  }),
  documentComments: many(documentCommentTable),
  documentNotes: many(documentNoteTable),
  documentPageVisits: many(documentPageVisitTable),
  documentTasks: many(documentTaskTable),
  favorites: many(favoriteTable),
  documentActivities: many(documentActivityTable),
  documentToDocumentTags: many(documentToDocumentTagTable)
}));

export const documentCommentRelations = relations(
  documentCommentTable,
  ({ one }) => ({
    document: one(documentTable, {
      fields: [documentCommentTable.documentId],
      references: [documentTable.id]
    }),
    user: one(userTable, {
      fields: [documentCommentTable.userId],
      references: [userTable.id]
    })
  })
);

export const documentNoteRelations = relations(documentNoteTable, ({ one }) => ({
  document: one(documentTable, {
    fields: [documentNoteTable.documentId],
    references: [documentTable.id]
  }),
  user: one(userTable, {
    fields: [documentNoteTable.userId],
    references: [userTable.id]
  })
}));

export const documentPageVisitRelations = relations(
  documentPageVisitTable,
  ({ one }) => ({
    document: one(documentTable, {
      fields: [documentPageVisitTable.documentId],
      references: [documentTable.id]
    }),
    user: one(userTable, {
      fields: [documentPageVisitTable.userId],
      references: [userTable.id]
    })
  })
);

export const documentTaskRelations = relations(documentTaskTable, ({ one }) => ({
  document: one(documentTable, {
    fields: [documentTaskTable.documentId],
    references: [documentTable.id]
  })
}));

export const favoriteRelations = relations(favoriteTable, ({ one }) => ({
  document: one(documentTable, {
    fields: [favoriteTable.documentId],
    references: [documentTable.id]
  }),
  user: one(userTable, {
    fields: [favoriteTable.userId],
    references: [userTable.id]
  })
}));

export const invitationRelations = relations(invitationTable, ({ one }) => ({
  organization: one(organizationTable, {
    fields: [invitationTable.organizationId],
    references: [organizationTable.id]
  })
}));

export const accountRelations = relations(accountTable, ({ one }) => ({
  user: one(userTable, {
    fields: [accountTable.userId],
    references: [userTable.id]
  })
}));

export const feedbackRelations = relations(feedbackTable, ({ one }) => ({
  organization: one(organizationTable, {
    fields: [feedbackTable.organizationId],
    references: [organizationTable.id]
  }),
  user: one(userTable, {
    fields: [feedbackTable.userId],
    references: [userTable.id]
  })
}));

export const notificationRelations = relations(
  notificationTable,
  ({ one }) => ({
    user: one(userTable, {
      fields: [notificationTable.userId],
      references: [userTable.id]
    })
  })
);

export const sessionRelations = relations(sessionTable, ({ one }) => ({
  user: one(userTable, {
    fields: [sessionTable.userId],
    references: [userTable.id]
  })
}));

export const workHoursRelations = relations(
  workHoursTable,
  ({ one, many }) => ({
    organization: one(organizationTable, {
      fields: [workHoursTable.organizationId],
      references: [organizationTable.id]
    }),
    workTimeSlots: many(workTimeSlotTable)
  })
);

export const workTimeSlotRelations = relations(
  workTimeSlotTable,
  ({ one }) => ({
    workHour: one(workHoursTable, {
      fields: [workTimeSlotTable.workHoursId],
      references: [workHoursTable.id]
    })
  })
);

export const documentActivityRelations = relations(
  documentActivityTable,
  ({ one }) => ({
    document: one(documentTable, {
      fields: [documentActivityTable.documentId],
      references: [documentTable.id]
    })
  })
);

export const webhookRelations = relations(webhookTable, ({ one }) => ({
  organization: one(organizationTable, {
    fields: [webhookTable.organizationId],
    references: [organizationTable.id]
  })
}));

export const membershipRelations = relations(membershipTable, ({ one }) => ({
  user: one(userTable, {
    fields: [membershipTable.userId],
    references: [userTable.id]
  }),
  organization: one(organizationTable, {
    fields: [membershipTable.organizationId],
    references: [organizationTable.id]
  })
}));

export const organizationLogoRelations = relations(
  organizationLogoTable,
  ({ one }) => ({
    organization: one(organizationTable, {
      fields: [organizationLogoTable.organizationId],
      references: [organizationTable.id]
    })
  })
);

export const subscriptionRelations = relations(subscriptionTable, ({ one }) => ({
  organization: one(organizationTable, {
    fields: [subscriptionTable.organizationId],
    references: [organizationTable.id]
  })
}));

export const subscriptionItemRelations = relations(subscriptionItemTable, ({ one }) => ({
  organization: one(subscriptionTable, {
    fields: [subscriptionItemTable.subscriptionId],
    references: [subscriptionTable.id]
  })
}));

export const orderRelations = relations(orderTable, ({ one }) => ({
  organization: one(organizationTable, {
    fields: [orderTable.organizationId],
    references: [organizationTable.id]
  })
}));

export const orderItemRelations = relations(orderItemTable, ({ one }) => ({
  organization: one(orderTable, {
    fields: [orderItemTable.orderId],
    references: [orderTable.id]
  })
}));

export const documentTagRelations = relations(documentTagTable, ({ many }) => ({
  documentToDocumentTags: many(documentToDocumentTagTable)
}));

export const documentToDocumentTagRelations = relations(
  documentToDocumentTagTable,
  ({ one }) => ({
    document: one(documentTable, {
      fields: [documentToDocumentTagTable.documentId],
      references: [documentTable.id]
    }),
    documentTag: one(documentTagTable, {
      fields: [documentToDocumentTagTable.documentTagId],
      references: [documentTagTable.id]
    })
  })
);
