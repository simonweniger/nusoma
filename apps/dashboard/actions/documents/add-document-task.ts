'use server';

import { updateTag } from 'next/cache';

import { db } from '@workspace/database/client';
import { documentTaskTable } from '@workspace/database/schema';

import { authOrganizationActionClient } from '~/actions/safe-action';
import { Caching, OrganizationCacheKey } from '~/data/caching';
import { addDocumentTaskSchema } from '~/schemas/documents/add-document-task-schema';

export const addDocumentTask = authOrganizationActionClient
  .metadata({ actionName: 'addDocumentTask' })
  .inputSchema(addDocumentTaskSchema)
  .action(async ({ parsedInput, ctx }) => {
    await db.insert(documentTaskTable).values({
      documentId: parsedInput.documentId,
      title: parsedInput.title,
      description: parsedInput.description,
      status: parsedInput.status,
      dueDate: parsedInput.dueDate ? parsedInput.dueDate : null
    });

    updateTag(
      Caching.createOrganizationTag(
        OrganizationCacheKey.DocumentTasks,
        ctx.organization.id,
        parsedInput.documentId
      )
    );
  });
