import { db } from '@nusoma/database'
import { workerFolder } from '@nusoma/database/schema'
import { and, asc, desc, eq, isNull } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-server'
import { createLogger } from '@/lib/logger/console-logger'

const logger = createLogger('FoldersAPI')

// GET - Fetch folders for a workspace
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 })
    }

    // Fetch all folders for the workspace, ordered by sortOrder and createdAt
    const folders = await db
      .select()
      .from(workerFolder)
      .where(
        and(eq(workerFolder.workspaceId, workspaceId), eq(workerFolder.userId, session.user.id))
      )
      .orderBy(asc(workerFolder.sortOrder), asc(workerFolder.createdAt))

    return NextResponse.json({ folders })
  } catch (error) {
    logger.error('Error fetching folders:', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new folder
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, workspaceId, parentId, color } = body

    if (!name || !workspaceId) {
      return NextResponse.json({ error: 'Name and workspace ID are required' }, { status: 400 })
    }

    // Generate a new ID
    const id = crypto.randomUUID()

    // Use transaction to ensure sortOrder consistency
    const newFolder = await db.transaction(async (tx) => {
      // Get the next sort order for the parent (or root level)
      const existingFolders = await tx
        .select({ sortOrder: workerFolder.sortOrder })
        .from(workerFolder)
        .where(
          and(
            eq(workerFolder.workspaceId, workspaceId),
            eq(workerFolder.userId, session.user.id),
            parentId ? eq(workerFolder.parentId, parentId) : isNull(workerFolder.parentId)
          )
        )
        .orderBy(desc(workerFolder.sortOrder))
        .limit(1)

      const nextSortOrder = existingFolders.length > 0 ? existingFolders[0].sortOrder + 1 : 0

      // Insert the new folder within the same transaction
      const [folder] = await tx
        .insert(workerFolder)
        .values({
          id,
          name: name.trim(),
          userId: session.user.id,
          workspaceId,
          parentId: parentId || null,
          color: color || '#6B7280',
          sortOrder: nextSortOrder,
        })
        .returning()

      return folder
    })

    logger.info('Created new folder:', { id, name, workspaceId, parentId })

    return NextResponse.json({ folder: newFolder })
  } catch (error) {
    logger.error('Error creating folder:', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
