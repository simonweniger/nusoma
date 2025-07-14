import { db } from '@nusoma/database'
import {
  ActionType,
  ActorType,
  project,
  projectActivity,
  projectTag,
  projectToProjectTag,
} from '@nusoma/database/schema'
import { jsonAggBuildObject } from '@nusoma/database/utils'
import { eq, getTableColumns, inArray } from 'drizzle-orm'

/*
   This is an advanced create/update that
    - handles many-to-many (project -> projectToProjectTags <- projectTags) relationships.
    - detects and records changes in a separate table.

  Drizzle is not well equipped to handle many-to-many relationships, so we have to handle them manually.
  But they are working on improving the query API, so this might change in the future.

  Note: If you just want to see normal create/update, look into the createApiKey and updateApiKey actions.
*/

const fieldsToCheck = [
  'record',
  'image',
  'name',
  'email',
  'address',
  'phone',
  'stage',
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

type ProjectChanges = {
  [K in FieldToCheck]?: ChangeEntry
}

type Project = typeof project.$inferSelect
type ProjectWithTags = Project & {
  tags: Tag[]
}

function safeStringify<T>(value: T): string | null {
  if (value === null || value === undefined) {
    return null
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

function joinTags(tags: { text: string }[]): string {
  return [...new Set(tags?.map((tag) => tag.text))].sort().join(',')
}

export function detectChanges(
  currentProject: Partial<ProjectWithTags> | null,
  updatedProject: ProjectWithTags,
  updateData?: Partial<Project>
): ProjectChanges {
  const changes: ProjectChanges = {}

  for (const field of fieldsToCheck) {
    if (field === 'tags') {
      const oldTags = currentProject?.tags ? joinTags(currentProject.tags) : null
      const newTags = joinTags(updatedProject.tags)
      if (oldTags !== newTags) {
        changes.tags = { old: oldTags, new: newTags }
      }
    } else {
      const oldValue = currentProject ? safeStringify(currentProject[field as keyof Project]) : null
      const newValue = safeStringify(updatedProject[field as keyof Project])
      if (oldValue !== newValue && (!updateData || field in updateData)) {
        changes[field] = { old: oldValue, new: newValue }
      }
    }
  }

  return changes
}

export async function createProjectAndCaptureEvent(
  projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'workspaceId'> & {
    createdAt?: Date
    workspaceId: string
    tags?: Tag[]
  },
  actorId: string
): Promise<ProjectWithTags> {
  return await db.transaction(async (tx) => {
    const { tags, ...projectValues } = projectData
    const createdAt = projectValues.createdAt ?? new Date()

    // Insert new project
    const newProject = await tx
      .insert(project)
      .values({
        ...projectValues,
        createdAt,
        updatedAt: createdAt,
      })
      .returning()
      .then((rows) => ({
        ...rows[0],
        tags: [] as Required<Tag>[],
      }))

    // Handle tags
    if (tags && tags.length > 0) {
      // Find existing tags
      const existingTags = await tx
        .select({ id: projectTag.id, text: projectTag.text })
        .from(projectTag)
        .where(
          inArray(
            projectTag.text,
            tags?.map((tag) => tag.text)
          )
        )
      const existingTagTexts = new Set(existingTags?.map((tag) => tag.text))

      // Insert missing tags
      const newTags = tags.filter((tag) => !existingTagTexts.has(tag.text))
      let insertedTags: Required<Tag>[] = []
      if (newTags.length > 0) {
        insertedTags = await tx
          .insert(projectTag)
          .values(newTags.map(({ text }) => ({ text })))
          .returning({ id: projectTag.id, text: projectTag.text })
      }

      newProject.tags = [...existingTags, ...insertedTags]

      // Insert relationships
      if (newProject.tags.length > 0) {
        await tx.insert(projectToProjectTag).values(
          newProject.tags.map(({ id }) => ({
            projectId: newProject.id,
            projectTagId: id,
          }))
        )
      }
    }

    // Detect changes (initial project creation)
    const changes = detectChanges(null, newProject)

    // Record changes
    await tx.insert(projectActivity).values({
      projectId: newProject.id,
      actionType: ActionType.CREATE,
      actorId,
      actorType: ActorType.MEMBER,
      metadata: changes,
      occurredAt: createdAt,
    })

    return newProject
  })
}

export async function updateProjectAndCaptureEvent(
  projectId: string,
  updateData: Partial<
    Omit<typeof project.$inferInsert, 'id' | 'createdAt' | 'updatedAt' | 'organizationId'> & {
      tags?: Tag[]
    }
  >,
  actorId: string
): Promise<ProjectChanges> {
  const { tags, ...projectValues } = updateData
  return db.transaction(async (tx) => {
    // Get current state
    const [currentProject] = await tx
      .select({
        ...getTableColumns(project),
        tags: jsonAggBuildObject({
          id: project.id,
          text: projectTag.text,
        }),
      })
      .from(project)
      .leftJoin(projectToProjectTag, eq(project.id, projectToProjectTag.projectId))
      .leftJoin(projectTag, eq(projectToProjectTag.projectTagId, projectTag.id))
      .where(eq(project.id, projectId))
      .groupBy(project.id)

    if (!currentProject) {
      throw new Error('Project not found')
    }

    // Update
    const updatedProject =
      Object.keys(projectValues).length > 0
        ? await tx
            .update(project)
            .set(projectValues)
            .where(eq(project.id, projectId))
            .returning()
            .then((rows) => ({
              ...rows[0],
              tags: currentProject.tags,
            }))
        : Object.assign({}, currentProject)

    if (tags && tags.length > 0) {
      // Remove existing tag relationships
      await tx.delete(projectToProjectTag).where(eq(projectToProjectTag.projectId, projectId))

      // Add new tags and relationships
      updatedProject.tags = []
      for (const tag of tags) {
        // Find or create tag
        const [existingTag] = await tx
          .select({ id: projectTag.id })
          .from(projectTag)
          .where(tag.id ? eq(projectTag.id, tag.id) : eq(projectTag.text, tag.text))

        let projectTagId = existingTag?.id
        if (!projectTagId) {
          const [newTag] = await tx
            .insert(projectTag)
            .values({ id: tag.id, text: tag.text })
            .returning({ id: project.id })
          projectTagId = newTag.id
        }

        // Create relationship
        await tx.insert(projectToProjectTag).values({
          projectId,
          projectTagId,
        })

        // Store updated tag
        updatedProject.tags.push({
          id: projectTagId,
          text: tag.text,
        })
      }
    }

    // Record changes
    const changes = detectChanges(currentProject, updatedProject, projectValues)

    if (Object.keys(changes).length > 0) {
      await tx.insert(projectActivity).values({
        projectId,
        actionType: ActionType.UPDATE,
        actorId,
        actorType: ActorType.MEMBER,
        metadata: changes,
        occurredAt: new Date(),
      })
    }

    return changes
  })
}
