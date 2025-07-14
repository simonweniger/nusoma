import { and, db, eq } from '@nusoma/database'
import { favorite as favoriteTable } from '@nusoma/database/schema'
import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params
    const ctx = await getSession()

    if (!ctx) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [favorite] = await db
      .select({})
      .from(favoriteTable)
      .where(and(eq(favoriteTable.userId, ctx.session.userId), eq(favoriteTable.taskId, taskId)))
      .limit(1)

    return Response.json({ isInFavorites: !!favorite })
  } catch (error) {
    console.error('Error checking task favorites:', error)
    return Response.json({ error: 'Failed to check favorites' }, { status: 500 })
  }
}
