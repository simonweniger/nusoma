import { and, arrayContains, db, eq } from '@workspace/database/client';
import { webhook, type WebhookTrigger } from '@workspace/database/schema';

import { sendPayload } from './send-payload';

// In the beginning, just call this method whenever an event occurs,
// but ideally you want to call webhooks in a separate worker process.

export async function callWebhooks<T>(
  organizationId: string,
  trigger: WebhookTrigger,
  payload: T
) {
  const webhooks = await db
    .select({
      id: webhook.id,
      url: webhook.url,
      triggers: webhook.triggers,
      secret: webhook.secret
    })
    .from(webhook)
    .where(
      and(
        eq(webhook.organizationId, organizationId),
        arrayContains(webhook.triggers, [trigger])
      )
    )
    .orderBy(webhook.createdAt);

  for (const webhook of webhooks) {
    let retryCount = 0;
    const MAX_RETRY_COUNT = 3;
    while (retryCount < MAX_RETRY_COUNT) {
      retryCount++;
      try {
        console.log('SENDING webhook payload');
        const response = await sendPayload<T>(webhook, trigger, payload);
        console.log('SENT webhook payload');
        if (response.ok) {
          console.log('SUCCESS webhook payload');
          break;
        }
        console.log('FAILED webhook payload');
      } catch (e) {
        console.error(
          `Error executing webhook ${webhook.id} for event: ${trigger}, URL: ${webhook.url}`,
          e
        );
      }
    }
  }
}
