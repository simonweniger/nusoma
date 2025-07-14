import 'server-only'

import { db } from '@nusoma/database'
import { taskComment as taskCommentTable, task as taskTable } from '@nusoma/database/schema'
import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

const createCommentSchema = z.object({
  text: z.string().min(1).max(2000),
})

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

// POST /api/tasks/[taskId]/comments - Add comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getAuthenticatedUser()
    const { taskId } = await params
    const body = await request.json()

    const validatedData = createCommentSchema.parse(body)

    // Check if task exists
    const [task] = await db.select().from(taskTable).where(eq(taskTable.id, taskId)).limit(1)

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const [comment] = await db
      .insert(taskCommentTable)
      .values({
        taskId,
        text: validatedData.text,
        userId: user.id,
      })
      .returning()

    return NextResponse.json(comment)
  } catch (error) {
    console.error('Error creating task comment:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create comment' },
      { status: 500 }
    )
  }
}
