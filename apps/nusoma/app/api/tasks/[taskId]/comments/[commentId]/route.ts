import 'server-only'

import { db } from '@nusoma/database'
import { taskComment as taskCommentTable } from '@nusoma/database/schema'
import { and, eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

const updateCommentSchema = z.object({
  text: z.string().min(1).max(2000),
})

async function getAuthenticatedUser() {
  const session = await getSession()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }
  return session.user
}

// PUT /api/tasks/[taskId]/comments/[commentId] - Update comment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; commentId: string }> }
) {
  try {
    const user = await getAuthenticatedUser()
    const { commentId } = await params
    const body = await request.json()

    const validatedData = updateCommentSchema.parse(body)

    // Check if comment exists and user owns it
    const [comment] = await db
      .select()
      .from(taskCommentTable)
      .where(and(eq(taskCommentTable.id, commentId), eq(taskCommentTable.userId, user.id)))
      .limit(1)

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found or access denied' }, { status: 404 })
    }

    const [updatedComment] = await db
      .update(taskCommentTable)
      .set({ text: validatedData.text })
      .where(eq(taskCommentTable.id, commentId))
      .returning()

    return NextResponse.json(updatedComment)
  } catch (error) {
    console.error('Error updating task comment:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update comment' },
      { status: 500 }
    )
  }
}

// DELETE /api/tasks/[taskId]/comments/[commentId] - Delete comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; commentId: string }> }
) {
  try {
    const user = await getAuthenticatedUser()
    const { commentId } = await params

    // Check if comment exists and user owns it
    const [comment] = await db
      .select()
      .from(taskCommentTable)
      .where(and(eq(taskCommentTable.id, commentId), eq(taskCommentTable.userId, user.id)))
      .limit(1)

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found or access denied' }, { status: 404 })
    }

    await db.delete(taskCommentTable).where(eq(taskCommentTable.id, commentId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task comment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete comment' },
      { status: 500 }
    )
  }
}
