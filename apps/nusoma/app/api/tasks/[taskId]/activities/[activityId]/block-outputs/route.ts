import { db } from '@nusoma/database'
import { taskBlockOutput } from '@nusoma/database/schema'
import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string; activityId: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { activityId } = await params

    // Fetch all block outputs for this activity
    const blockOutputs = await db
      .select()
      .from(taskBlockOutput)
      .where(eq(taskBlockOutput.taskActivityId, activityId))
      .orderBy(taskBlockOutput.startedAt)

    return NextResponse.json({
      blockOutputs: blockOutputs.map((output) => ({
        id: output.id,
        blockId: output.blockId,
        blockName: output.blockName,
        blockType: output.blockType,
        executionId: output.executionId,
        output: output.output,
        input: output.input,
        success: output.success,
        error: output.error,
        durationMs: output.durationMs,
        startedAt: output.startedAt,
        endedAt: output.endedAt,
      })),
    })
  } catch (error) {
    console.error('Error fetching block outputs:', error)
    return NextResponse.json({ error: 'Failed to fetch block outputs' }, { status: 500 })
  }
}
