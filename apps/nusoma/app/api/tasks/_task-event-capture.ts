import { db, eq, getTableColumns, inArray } from '@nusoma/database'
import {
  ActionType,
  ActorType,
  taskActivity as taskActivityTable,
  taskBlockOutput as taskBlockOutputTable,
  task as taskTable,
  taskTag as taskTagTable,
  taskToTaskTag as taskToTaskTagTable,
} from '@nusoma/database/schema'
import { jsonAggBuildObject } from '@nusoma/database/utils'
import { revalidateTag } from 'next/cache'
import { Caching, UserCacheKey } from '@/caching'

/*
   This is an advanced create/update that
    - handles many-to-many (task -> taskToTaskTags <- taskTags) relationships.
    - detects and records changes in a separate table.

  Drizzle is not well equipped to handle many-to-many relationships, so we have to handle them manually.
  But they are working on improving the query API, so this might change in the future.

  Note: If you just want to see normal create/update, look into the createApiKey and updateApiKey actions.
*/

const fieldsToCheck = [
  'title',
  'description',
  'status',
  'priority',
  'assigneeId',
  'projectId',
  'scheduleDate',
  'tags',
] as const

type FieldToCheck = (typeof fieldsToCheck)[number]

type Tag = {
  id?: string
  text: string
}

type ChangeEntry = {
  old: string | null
  new: string | null
}

type TaskChanges = {
  [K in FieldToCheck]?: ChangeEntry
}

type Task = typeof taskTable.$inferSelect
type TaskWithTags = Omit<Task, 'tags'> & {
  tags: Tag[]
}

function safeStringify<T>(value: T): string | null {
  if (value === null || value === undefined) {
    return null
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

function joinTags(tags: { text: string }[]): string {
  return [...new Set(tags.map((tag) => tag.text))].sort().join(',')
}

export function detectChanges(
  currentTask: Partial<TaskWithTags> | null,
  updatedTask: TaskWithTags,
  updateData?: Partial<Task>
): TaskChanges {
  const changes: TaskChanges = {}

  for (const field of fieldsToCheck) {
    if (field === 'tags') {
      const oldTags = currentTask?.tags ? joinTags(currentTask.tags) : null
      const newTags = joinTags(updatedTask.tags)
      if (oldTags !== newTags) {
        changes.tags = { old: oldTags, new: newTags }
      }
    } else {
      const oldValue = currentTask ? safeStringify(currentTask[field as keyof Task]) : null
      const newValue = safeStringify(updatedTask[field as keyof Task])
      if (oldValue !== newValue && (!updateData || field in updateData)) {
        changes[field] = { old: oldValue, new: newValue }
      }
    }
  }

  return changes
}

export async function createTaskAndCaptureEvent(
  taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'workspaceId'> & {
    createdAt?: Date
    workspaceId: string
    tags?: Tag[]
  },
  actorId: string
): Promise<TaskWithTags> {
  return await db.transaction(async (tx) => {
    const { tags, ...taskValues } = taskData
    const createdAt = taskValues.createdAt ?? new Date()

    // Insert new task
    const newTask = await tx
      .insert(taskTable)
      .values({
        ...taskValues,
        createdAt,
        updatedAt: createdAt,
      })
      .returning()
      .then((rows) => ({
        ...rows[0],
        tags: [] as Tag[],
      }))

    // Handle tags
    if (tags && tags.length > 0) {
      // Find existing tags
      const existingTags = await tx
        .select({ id: taskTagTable.id, text: taskTagTable.text })
        .from(taskTagTable)
        .where(
          inArray(
            taskTagTable.text,
            tags.map((tag: Tag) => tag.text)
          )
        )
      const existingTagTexts = new Set(existingTags?.map((tag) => tag.text))

      // Insert missing tags
      const newTags: Tag[] = tags.filter((tag: Tag) => !existingTagTexts.has(tag.text))
      let insertedTags: Required<Tag>[] = []
      if (newTags.length > 0) {
        insertedTags = await tx
          .insert(taskTagTable)
          .values(newTags.map((tag: Tag) => ({ text: tag.text })))
          .returning({ id: taskTagTable.id, text: taskTagTable.text })
      }

      newTask.tags = [...existingTags, ...insertedTags]

      // Insert relationships
      if (newTask.tags.length > 0) {
        await tx.insert(taskToTaskTagTable).values(
          newTask.tags.map(({ id }) => ({
            taskId: newTask.id,
            taskTagId: id!,
          }))
        )
      }
    }

    // Detect changes (initial task creation)
    const changes = detectChanges(null, newTask)

    // Record changes
    await tx.insert(taskActivityTable).values({
      taskId: newTask.id,
      actionType: ActionType.CREATE,
      actorId,
      actorType: ActorType.MEMBER,
      metadata: changes,
      occurredAt: createdAt,
    })

    return newTask
  })
}

export async function updateTaskAndCaptureEvent(
  taskId: string,
  updateData: Partial<
    Omit<
      typeof taskTable.$inferInsert,
      'id' | 'createdAt' | 'updatedAt' | 'workspaceId' | 'tags'
    > & {
      tags?: Tag[]
    }
  >,
  actorId: string
): Promise<TaskChanges> {
  const { tags, ...taskValues } = updateData
  return db.transaction(async (tx) => {
    // Get current state
    const [currentTask] = await tx
      .select({
        ...getTableColumns(taskTable),
        tags: jsonAggBuildObject({
          id: taskTagTable.id,
          text: taskTagTable.text,
        }),
      })
      .from(taskTable)
      .leftJoin(taskToTaskTagTable, eq(taskTable.id, taskToTaskTagTable.taskId))
      .leftJoin(taskTagTable, eq(taskToTaskTagTable.taskTagId, taskTagTable.id))
      .where(eq(taskTable.id, taskId))
      .groupBy(taskTable.id)

    if (!currentTask) {
      throw new Error('Task not found')
    }

    // Update
    const updatedTask =
      Object.keys(taskValues).length > 0
        ? await tx
            .update(taskTable)
            .set(taskValues)
            .where(eq(taskTable.id, taskId))
            .returning()
            .then((rows) => ({
              ...rows[0],
              tags: currentTask.tags,
            }))
        : Object.assign({}, currentTask)

    if (tags && tags.length > 0) {
      // Remove existing tag relationships
      await tx.delete(taskToTaskTagTable).where(eq(taskToTaskTagTable.taskId, taskId))

      // Add new tags and relationships
      updatedTask.tags = []
      for (const tag of tags) {
        const [newTag] = await tx
          .insert(taskTagTable)
          .values({ text: tag.text })
          .onConflictDoNothing({ target: taskTagTable.text })
          .returning({ id: taskTagTable.id })

        let taskTagId = newTag?.id
        if (!taskTagId) {
          const [existingTag] = await tx
            .select({ id: taskTagTable.id })
            .from(taskTagTable)
            .where(eq(taskTagTable.text, tag.text))
          taskTagId = existingTag?.id
        }

        // Create relationship
        if (taskTagId) {
          await tx.insert(taskToTaskTagTable).values({
            taskId,
            taskTagId,
          })

          // Store updated tag
          updatedTask.tags.push({
            id: taskTagId,
            text: tag.text,
          })
        }
      }
    }

    // Record changes
    const changes = detectChanges(currentTask, updatedTask, taskValues)

    if (Object.keys(changes).length > 0) {
      await tx.insert(taskActivityTable).values({
        taskId,
        actionType: ActionType.UPDATE,
        actorId,
        actorType: ActorType.MEMBER,
        metadata: changes,
        occurredAt: new Date(),
      })
    }

    revalidateTag(Caching.createUserTag(UserCacheKey.TaskTimelineEvents, actorId, taskId))

    return changes
  })
}

export async function captureBlockOutputsAsTaskEvents(
  taskId: string,
  executionId: string,
  blockLogs: Array<{
    blockId: string
    blockName?: string
    blockType?: string
    startedAt: string
    endedAt: string
    durationMs: number
    success: boolean
    output?: any
    input?: any
    error?: string
  }>,
  actorId: string
): Promise<void> {
  return await db.transaction(async (tx) => {
    // Create a task activity entry for this execution
    const [taskActivity] = await tx
      .insert(taskActivityTable)
      .values({
        taskId,
        actionType: ActionType.BLOCK_EXECUTED,
        actorId,
        actorType: ActorType.SYSTEM,
        metadata: {
          executionId,
          totalBlocks: blockLogs.length,
          successfulBlocks: blockLogs.filter((log) => log.success).length,
          failedBlocks: blockLogs.filter((log) => !log.success).length,
        },
        occurredAt: new Date(),
      })
      .returning()

    // Create block output entries for each block execution
    if (blockLogs.length > 0) {
      const blockOutputEntries = blockLogs.map((log) => ({
        taskActivityId: taskActivity.id,
        blockId: log.blockId,
        blockName: log.blockName || null,
        blockType: log.blockType || 'unknown',
        executionId,
        output: log.output || {},
        input: log.input || null,
        success: log.success,
        error: log.error || null,
        durationMs: Math.round(log.durationMs || 0),
        startedAt: new Date(log.startedAt),
        endedAt: new Date(log.endedAt),
      }))

      await tx.insert(taskBlockOutputTable).values(blockOutputEntries)
    }
  })
}
