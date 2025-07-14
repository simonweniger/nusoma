import { createSafeActionClient, DEFAULT_SERVER_ERROR_MESSAGE } from 'next-safe-action'
import { z } from 'zod'
import { getSession } from '@/lib/auth-server'
import {
  ForbiddenError,
  GatewayError,
  NotFoundError,
  PreConditionError,
  ValidationError,
} from '@/lib/errors'

export const actionClient = createSafeActionClient({
  handleServerError(e) {
    if (
      e instanceof ValidationError ||
      e instanceof ForbiddenError ||
      e instanceof NotFoundError ||
      e instanceof PreConditionError ||
      e instanceof GatewayError
    ) {
      return e.message
    }

    return DEFAULT_SERVER_ERROR_MESSAGE
  },
  defineMetadataSchema() {
    return z.object({
      actionName: z.string(),
    })
  },
})

export const authActionClient = actionClient.use(async ({ next }) => {
  const session = await getSession()

  if (!session) {
    throw new ForbiddenError('Unauthorized')
  }

  return next({ ctx: session })
})
