import { db } from '@nusoma/database'
import { apiKey } from '@nusoma/database/schema'
import { eq } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { createLogger } from '@/lib/logger/console-logger'
import { getWorkerById } from '@/lib/workers/utils'

const logger = createLogger('WorkerMiddleware')

export interface ValidationResult {
  error?: { message: string; status: number }
  worker?: any
}

export async function validateWorkerAccess(
  request: NextRequest,
  workerId: string,
  requireDeployment = true
): Promise<ValidationResult> {
  try {
    const worker = await getWorkerById(workerId)
    if (!worker) {
      return {
        error: {
          message: 'Worker not found',
          status: 404,
        },
      }
    }

    if (requireDeployment) {
      if (!worker.isDeployed) {
        return {
          error: {
            message: 'Worker is not deployed',
            status: 403,
          },
        }
      }

      // API key authentication
      let apiKeyHeader = null
      for (const [key, value] of request.headers.entries()) {
        if (key.toLowerCase() === 'x-api-key' && value) {
          apiKeyHeader = value
          break
        }
      }

      if (!apiKeyHeader) {
        return {
          error: {
            message: 'Unauthorized: API key required',
            status: 401,
          },
        }
      }

      // Verify API key belongs to the user who owns the worker
      const userApiKeys = await db
        .select({
          key: apiKey.key,
        })
        .from(apiKey)
        .where(eq(apiKey.userId, worker.userId))

      const validApiKey = userApiKeys.some((k) => k.key === apiKeyHeader)

      if (!validApiKey) {
        return {
          error: {
            message: 'Unauthorized: Invalid API key',
            status: 401,
          },
        }
      }
    }
    return { worker }
  } catch (error) {
    logger.error('Validation error:', { error })
    return {
      error: {
        message: 'Internal server error',
        status: 500,
      },
    }
  }
}
