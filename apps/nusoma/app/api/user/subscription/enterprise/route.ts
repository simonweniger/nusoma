import { db } from '@nusoma/database'
import { member, subscription } from '@nusoma/database/schema'
import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-server'
import { createLogger } from '@/lib/logger/console-logger'
import { checkEnterprisePlan } from '@/lib/subscription/utils'

const logger = createLogger('EnterpriseSubscriptionAPI')

export async function GET() {
  try {
    const session = await getSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id

    const userSubscriptions = await db
      .select()
      .from(subscription)
      .where(and(eq(subscription.referenceId, userId), eq(subscription.status, 'active')))
      .limit(1)

    if (userSubscriptions.length > 0 && checkEnterprisePlan(userSubscriptions[0])) {
      const enterpriseSub = userSubscriptions[0]
      logger.info('Found direct enterprise subscription', {
        userId,
        subId: enterpriseSub.id,
      })

      return NextResponse.json({
        success: true,
        subscription: enterpriseSub,
      })
    }

    const memberships = await db
      .select({ organizationId: member.organizationId })
      .from(member)
      .where(eq(member.userId, userId))

    for (const { organizationId } of memberships) {
      const orgSubscriptions = await db
        .select()
        .from(subscription)
        .where(and(eq(subscription.referenceId, organizationId), eq(subscription.status, 'active')))
        .limit(1)

      if (orgSubscriptions.length > 0 && checkEnterprisePlan(orgSubscriptions[0])) {
        const enterpriseSub = orgSubscriptions[0]
        logger.info('Found organization enterprise subscription', {
          userId,
          orgId: organizationId,
          subId: enterpriseSub.id,
        })

        return NextResponse.json({
          success: true,
          subscription: enterpriseSub,
        })
      }
    }

    return NextResponse.json({
      success: false,
      subscription: null,
    })
  } catch (error) {
    logger.error('Error fetching enterprise subscription:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch enterprise subscription data',
      },
      { status: 500 }
    )
  }
}
