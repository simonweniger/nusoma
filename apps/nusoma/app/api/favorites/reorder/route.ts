import { db, eq } from '@nusoma/database'
import { favorite as favoriteTable } from '@nusoma/database/schema'
import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth-server'
import { updateFavoritesOrder } from '@/app/api/favorites/_favorites-order'

// PUT /api/favorites/reorder - Reorder favorites
export async function PUT(request: NextRequest) {
  try {
    const ctx = await getSession()

    if (!ctx) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { favorites } = body

    if (!Array.isArray(favorites)) {
      return Response.json({ error: 'Invalid input: favorites must be an array' }, { status: 400 })
    }

    // Validate that each favorite has id and order
    for (const favorite of favorites) {
      if (!favorite.id || typeof favorite.order !== 'number') {
        return Response.json(
          { error: 'Invalid input: each favorite must have id and order' },
          { status: 400 }
        )
      }
    }

    const userFavorites = await db
      .select({ id: favoriteTable.id })
      .from(favoriteTable)
      .where(eq(favoriteTable.userId, ctx.session.userId))

    const updates = favorites
      .map((favoriteToUpdate) => {
        if (userFavorites.some((f) => f.id === favoriteToUpdate.id)) {
          return db
            .update(favoriteTable)
            .set({ order: favoriteToUpdate.order })
            .where(eq(favoriteTable.id, favoriteToUpdate.id))
        }
        return undefined
      })
      .filter((update) => update !== undefined)

    if (updates.length > 0) {
      await db.transaction(async (tx) => {
        for (const update of updates) {
          await tx.execute(update)
        }
        await updateFavoritesOrder(tx, ctx.session.userId)
      })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Error reordering favorites:', error)
    return Response.json({ error: 'Failed to reorder favorites' }, { status: 500 })
  }
}
