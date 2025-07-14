import { db } from '@nusoma/database'
import { memory } from '@nusoma/database/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger/console-logger'

const logger = createLogger('MemoryByIdAPI')

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET handler for retrieving a specific memory by ID
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const { id } = await params

  try {
    logger.info(`[${requestId}] Processing memory get request for ID: ${id}`)

    // Get workerId from query parameter (required)
    const url = new URL(request.url)
    const workerId = url.searchParams.get('workerId')

    if (!workerId) {
      logger.warn(`[${requestId}] Missing required parameter: workerId`)
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'workerId parameter is required',
          },
        },
        { status: 400 }
      )
    }

    // Query the database for the memory
    const memories = await db
      .select()
      .from(memory)
      .where(and(eq(memory.key, id), eq(memory.workerId, workerId), isNull(memory.deletedAt)))
      .orderBy(memory.createdAt)
      .limit(1)

    if (memories.length === 0) {
      logger.warn(`[${requestId}] Memory not found: ${id} for worker: ${workerId}`)
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Memory not found',
          },
        },
        { status: 404 }
      )
    }

    logger.info(`[${requestId}] Memory retrieved successfully: ${id} for worker: ${workerId}`)
    return NextResponse.json(
      {
        success: true,
        data: memories[0],
      },
      { status: 200 }
    )
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message || 'Failed to retrieve memory',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE handler for removing a specific memory
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const { id } = await params

  try {
    logger.info(`[${requestId}] Processing memory delete request for ID: ${id}`)

    // Get workerId from query parameter (required)
    const url = new URL(request.url)
    const workerId = url.searchParams.get('workerId')

    if (!workerId) {
      logger.warn(`[${requestId}] Missing required parameter: workerId`)
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'workerId parameter is required',
          },
        },
        { status: 400 }
      )
    }

    // Verify memory exists before attempting to delete
    const existingMemory = await db
      .select({ id: memory.id })
      .from(memory)
      .where(and(eq(memory.key, id), eq(memory.workerId, workerId), isNull(memory.deletedAt)))
      .limit(1)

    if (existingMemory.length === 0) {
      logger.warn(`[${requestId}] Memory not found: ${id} for worker: ${workerId}`)
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Memory not found',
          },
        },
        { status: 404 }
      )
    }

    // Soft delete by setting deletedAt timestamp
    await db
      .update(memory)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(memory.key, id), eq(memory.workerId, workerId)))

    logger.info(`[${requestId}] Memory deleted successfully: ${id} for worker: ${workerId}`)
    return NextResponse.json(
      {
        success: true,
        data: { message: 'Memory deleted successfully' },
      },
      { status: 200 }
    )
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message || 'Failed to delete memory',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * PUT handler for updating a specific memory
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const { id } = await params

  try {
    logger.info(`[${requestId}] Processing memory update request for ID: ${id}`)

    // Parse request body
    const body = await request.json()
    const { data, workerId } = body

    if (!data) {
      logger.warn(`[${requestId}] Missing required field: data`)
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Memory data is required',
          },
        },
        { status: 400 }
      )
    }

    if (!workerId) {
      logger.warn(`[${requestId}] Missing required field: workerId`)
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'workerId is required',
          },
        },
        { status: 400 }
      )
    }

    // Verify memory exists before attempting to update
    const existingMemories = await db
      .select()
      .from(memory)
      .where(and(eq(memory.key, id), eq(memory.workerId, workerId), isNull(memory.deletedAt)))
      .limit(1)

    if (existingMemories.length === 0) {
      logger.warn(`[${requestId}] Memory not found: ${id} for worker: ${workerId}`)
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Memory not found',
          },
        },
        { status: 404 }
      )
    }

    const existingMemory = existingMemories[0]

    // Validate memory data based on the existing memory type
    if (existingMemory.type === 'agent') {
      if (!data.role || !data.content) {
        logger.warn(`[${requestId}] Missing agent memory fields`)
        return NextResponse.json(
          {
            success: false,
            error: {
              message: 'Agent memory requires role and content',
            },
          },
          { status: 400 }
        )
      }

      if (!['user', 'assistant', 'system'].includes(data.role)) {
        logger.warn(`[${requestId}] Invalid agent role: ${data.role}`)
        return NextResponse.json(
          {
            success: false,
            error: {
              message: 'Agent role must be user, assistant, or system',
            },
          },
          { status: 400 }
        )
      }
    }

    // Update the memory with new data
    await db
      .update(memory)
      .set({
        data,
        updatedAt: new Date(),
      })
      .where(and(eq(memory.key, id), eq(memory.workerId, workerId)))

    // Fetch the updated memory
    const updatedMemories = await db
      .select()
      .from(memory)
      .where(and(eq(memory.key, id), eq(memory.workerId, workerId)))
      .limit(1)

    logger.info(`[${requestId}] Memory updated successfully: ${id} for worker: ${workerId}`)
    return NextResponse.json(
      {
        success: true,
        data: updatedMemories[0],
      },
      { status: 200 }
    )
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message || 'Failed to update memory',
        },
      },
      { status: 500 }
    )
  }
}
