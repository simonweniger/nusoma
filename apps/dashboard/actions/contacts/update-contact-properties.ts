'use server';

import { updateTag } from 'next/cache';

import { NotFoundError } from '@workspace/common/errors';
import { and, db, eq } from '@workspace/database/client';
import { contactTable } from '@workspace/database/schema';

import { updateContactAndCaptureEvent } from '~/actions/contacts/_contact-event-capture';
import { authOrganizationActionClient } from '~/actions/safe-action';
import { Caching, OrganizationCacheKey } from '~/data/caching';
import { updateContactPropertiesSchema } from '~/schemas/contacts/update-contact-properties-schema';

export const updateContactProperties = authOrganizationActionClient
  .metadata({ actionName: 'updateContactProperties' })
  .inputSchema(updateContactPropertiesSchema)
  .action(async ({ parsedInput, ctx }) => {
    const [contact] = await db
      .select({})
      .from(contactTable)
      .where(
        and(
          eq(contactTable.organizationId, ctx.organization.id),
          eq(contactTable.id, parsedInput.id)
        )
      )
      .limit(1);

    if (!contact) {
      throw new NotFoundError('Contact not found');
    }

    await updateContactAndCaptureEvent(
      parsedInput.id,
      {
        record: parsedInput.record,
        name: parsedInput.name,
        email: parsedInput.email ? parsedInput.email : null,
        address: parsedInput.address ? parsedInput.address : null,
        phone: parsedInput.phone ? parsedInput.phone : null
      },
      ctx.session.user.id
    );

    updateTag(
      Caching.createOrganizationTag(
        OrganizationCacheKey.Contacts,
        ctx.organization.id
      )
    );
    updateTag(
      Caching.createOrganizationTag(
        OrganizationCacheKey.Contact,
        ctx.organization.id,
        parsedInput.id
      )
    );

    for (const membership of ctx.organization.memberships) {
      updateTag(
        Caching.createOrganizationTag(
          OrganizationCacheKey.Favorites,
          ctx.organization.id,
          membership.userId
        )
      );
    }
  });
