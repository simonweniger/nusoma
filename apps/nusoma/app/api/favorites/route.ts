import { and, asc, db, eq } from '@nusoma/database'
import {
  favorite as favoriteTable,
  project as projectTable,
  task as taskTable,
} from '@nusoma/database/schema'
import type { FavoriteDto } from '@nusoma/types/dtos/favorite-dto'
import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth-server'
import { updateFavoritesOrder } from './_favorites-order'

// GET /api/favorites - Get user's favorites
export async function GET(request: NextRequest) {
  try {
    const ctx = await getSession()

    if (!ctx) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const favorites = await db
      .select({
        id: favoriteTable.id,
        order: favoriteTable.order,
        task: {
          id: taskTable.id,
          name: taskTable.title,
          status: taskTable.status,
          priority: taskTable.priority,
          projectId: taskTable.projectId,
          workspaceId: projectTable.workspaceId,
        },
        project: {
          id: projectTable.id,
          name: projectTable.name,
          stage: projectTable.stage,
          priority: projectTable.priority,
          workspaceId: projectTable.workspaceId,
        },
      })
      .from(favoriteTable)
      .innerJoin(taskTable, eq(favoriteTable.taskId, taskTable.id))
      .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
      .where(eq(favoriteTable.userId, ctx.session.userId))
      .orderBy(asc(favoriteTable.order))

    const response: FavoriteDto[] = favorites.map((favorite) => ({
      id: favorite.id,
      order: favorite.order,
      taskId: favorite.task.id || undefined,
      name: favorite.task.name,
      status: favorite.task.status || undefined,
      workspaceId: favorite.task.workspaceId || favorite.project.workspaceId || undefined,
      priority: favorite.task.priority,
      projectId: favorite.task.projectId || undefined,
    }))

    return Response.json(response)
  } catch (error) {
    console.error('Error fetching favorites:', error)
    return Response.json({ error: 'Failed to fetch favorites' }, { status: 500 })
  }
}

// POST /api/favorites - Add favorite
export async function POST(request: NextRequest) {
  try {
    const ctx = await getSession()

    if (!ctx) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, taskId, workerId } = body

    if (!projectId && !taskId && !workerId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (projectId) {
      const [favorite] = await db
        .select({})
        .from(favoriteTable)
        .where(
          and(eq(favoriteTable.userId, ctx.session.userId), eq(favoriteTable.projectId, projectId))
        )
        .limit(1)

      // Already added, return early
      if (favorite) {
        return Response.json({ success: true })
      }

      // Perform the transaction
      await db.transaction(async (tx) => {
        // Delete existing favorites
        await tx
          .delete(favoriteTable)
          .where(
            and(
              eq(favoriteTable.userId, ctx.session.userId),
              eq(favoriteTable.projectId, projectId)
            )
          )

        // Create a new favorite and set the order
        await tx.insert(favoriteTable).values({
          userId: ctx.session.userId,
          projectId: projectId,
          workerId: workerId,
          order: (
            await db
              .select()
              .from(favoriteTable)
              .where(eq(favoriteTable.userId, ctx.session.userId))
          ).length,
        })

        // Update the order after insertion
        await updateFavoritesOrder(tx, ctx.session.userId)
      })
    }

    if (taskId) {
      const [favorite] = await db
        .select({})
        .from(favoriteTable)
        .where(and(eq(favoriteTable.userId, ctx.session.userId), eq(favoriteTable.taskId, taskId)))
        .limit(1)

      // Already added, return early
      if (favorite) {
        return Response.json({ success: true })
      }

      // Perform the transaction
      await db.transaction(async (tx) => {
        // Delete existing favorites
        await tx
          .delete(favoriteTable)
          .where(
            and(eq(favoriteTable.userId, ctx.session.userId), eq(favoriteTable.taskId, taskId))
          )

        // Create a new favorite and set the order
        await tx.insert(favoriteTable).values({
          userId: ctx.session.userId,
          taskId: taskId,
          workerId: workerId,
          order: (
            await db
              .select()
              .from(favoriteTable)
              .where(eq(favoriteTable.userId, ctx.session.userId))
          ).length,
        })

        // Update the order after insertion
        await updateFavoritesOrder(tx, ctx.session.userId)
      })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Error adding favorite:', error)
    return Response.json({ error: 'Failed to add favorite' }, { status: 500 })
  }
}

// DELETE /api/favorites - Remove favorite
export async function DELETE(request: NextRequest) {
  try {
    const ctx = await getSession()

    if (!ctx) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, taskId, workerId } = body

    if (!projectId && !taskId && !workerId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (projectId) {
      await db.transaction(async (tx) => {
        await tx
          .delete(favoriteTable)
          .where(
            and(
              eq(favoriteTable.userId, ctx.session.userId),
              eq(favoriteTable.projectId, projectId)
            )
          )

        await updateFavoritesOrder(tx, ctx.session.userId)
      })
    }

    if (taskId) {
      await db.transaction(async (tx) => {
        await tx
          .delete(favoriteTable)
          .where(
            and(eq(favoriteTable.userId, ctx.session.userId), eq(favoriteTable.taskId, taskId))
          )

        await updateFavoritesOrder(tx, ctx.session.userId)
      })
    }

    if (workerId) {
      await db.transaction(async (tx) => {
        await tx
          .delete(favoriteTable)
          .where(
            and(eq(favoriteTable.userId, ctx.session.userId), eq(favoriteTable.workerId, workerId))
          )

        await updateFavoritesOrder(tx, ctx.session.userId)
      })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Error removing favorite:', error)
    return Response.json({ error: 'Failed to remove favorite' }, { status: 500 })
  }
}
