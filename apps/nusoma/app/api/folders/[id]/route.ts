import { db } from '@nusoma/database'
import { worker, workerFolder } from '@nusoma/database/schema'
import { and, eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-server'
import { createLogger } from '@/lib/logger/console-logger'

const logger = createLogger('FoldersIDAPI')

// PUT - Update a folder
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, color, isExpanded, parentId } = body

    // Verify the folder exists and belongs to the user
    const existingFolder = await db
      .select()
      .from(workerFolder)
      .where(and(eq(workerFolder.id, id), eq(workerFolder.userId, session.user.id)))
      .then((rows) => rows[0])

    if (!existingFolder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    // Prevent setting a folder as its own parent or creating circular references
    if (parentId && parentId === id) {
      return NextResponse.json({ error: 'Folder cannot be its own parent' }, { status: 400 })
    }

    // Check for circular references if parentId is provided
    if (parentId) {
      const wouldCreateCycle = await checkForCircularReference(id, parentId)
      if (wouldCreateCycle) {
        return NextResponse.json(
          { error: 'Cannot create circular folder reference' },
          { status: 400 }
        )
      }
    }

    // Update the folder
    const updates: any = { updatedAt: new Date() }
    if (name !== undefined) updates.name = name.trim()
    if (color !== undefined) updates.color = color
    if (isExpanded !== undefined) updates.isExpanded = isExpanded
    if (parentId !== undefined) updates.parentId = parentId || null

    const [updatedFolder] = await db
      .update(workerFolder)
      .set(updates)
      .where(eq(workerFolder.id, id))
      .returning()

    logger.info('Updated folder:', { id, updates })

    return NextResponse.json({ folder: updatedFolder })
  } catch (error) {
    logger.error('Error updating folder:', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a folder and all its contents
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify the folder exists and belongs to the user
    const existingFolder = await db
      .select()
      .from(workerFolder)
      .where(and(eq(workerFolder.id, id), eq(workerFolder.userId, session.user.id)))
      .then((rows) => rows[0])

    if (!existingFolder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    // Recursively delete folder and all its contents
    const deletionStats = await deleteFolderRecursively(id, session.user.id)

    logger.info('Deleted folder and all contents:', {
      id,
      deletionStats,
    })

    return NextResponse.json({
      success: true,
      deletedItems: deletionStats,
    })
  } catch (error) {
    logger.error('Error deleting folder:', { error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to recursively delete a folder and all its contents
async function deleteFolderRecursively(
  folderId: string,
  userId: string
): Promise<{ folders: number; workers: number }> {
  const stats = { folders: 0, workers: 0 }

  // Get all child folders first
  const childFolders = await db
    .select({ id: workerFolder.id })
    .from(workerFolder)
    .where(and(eq(workerFolder.parentId, folderId), eq(workerFolder.userId, userId)))

  // Recursively delete child folders
  for (const childFolder of childFolders) {
    const childStats = await deleteFolderRecursively(childFolder.id, userId)
    stats.folders += childStats.folders
    stats.workers += childStats.workers
  }

  // Delete all workers in this folder
  const workersInFolder = await db
    .select({ id: worker.id })
    .from(worker)
    .where(and(eq(worker.folderId, folderId), eq(worker.userId, userId)))

  if (workersInFolder.length > 0) {
    await db.delete(worker).where(and(eq(worker.folderId, folderId), eq(worker.userId, userId)))

    stats.workers += workersInFolder.length
  }

  // Delete this folder
  await db
    .delete(workerFolder)
    .where(and(eq(workerFolder.id, folderId), eq(workerFolder.userId, userId)))

  stats.folders += 1

  return stats
}

// Helper function to check for circular references
async function checkForCircularReference(folderId: string, parentId: string): Promise<boolean> {
  let currentParentId: string | null = parentId
  const visited = new Set<string>()

  while (currentParentId) {
    if (visited.has(currentParentId)) {
      return true // Circular reference detected
    }

    if (currentParentId === folderId) {
      return true // Would create a cycle
    }

    visited.add(currentParentId)

    // Get the parent of the current parent
    const parent: { parentId: string | null } | undefined = await db
      .select({ parentId: workerFolder.parentId })
      .from(workerFolder)
      .where(eq(workerFolder.id, currentParentId))
      .then((rows) => rows[0])

    currentParentId = parent?.parentId || null
  }

  return false
}
