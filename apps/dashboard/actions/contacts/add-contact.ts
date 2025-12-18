'use server';

import { updateTag } from 'next/cache';

import { ContactStage } from '@workspace/database/schema';

import { createContactAndCaptureEvent } from '~/actions/contacts/_contact-event-capture';
import { authOrganizationActionClient } from '~/actions/safe-action';
import { Caching, OrganizationCacheKey } from '~/data/caching';
import { addContactSchema } from '~/schemas/contacts/add-contact-schema';

export const addContact = authOrganizationActionClient
  .metadata({ actionName: 'addContact' })
  .inputSchema(addContactSchema)
  .action(async ({ parsedInput, ctx }) => {
    await createContactAndCaptureEvent(
      {
        record: parsedInput.record,
        name: parsedInput.name,
        email: parsedInput.email ? parsedInput.email : null,
        phone: parsedInput.phone ? parsedInput.phone : null,
        organizationId: ctx.organization.id,
        address: null,
        image: null,
        stage: ContactStage.LEAD
      },
      ctx.session.user.id
    );

    updateTag(
      Caching.createOrganizationTag(
        OrganizationCacheKey.Contacts,
        ctx.organization.id
      ));

    for (const membership of ctx.organization.memberships) {
      updateTag(
        Caching.createOrganizationTag(
          OrganizationCacheKey.Favorites,
          ctx.organization.id,
          membership.userId
        ));
    }
  });
