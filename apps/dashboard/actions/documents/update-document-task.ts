'use server';

import { updateTag } from 'next/cache';

import { NotFoundError } from '@workspace/common/errors';
import { and, db, eq } from '@workspace/database/client';
import { documentTable, documentTaskTable } from '@workspace/database/schema';

import { authOrganizationActionClient } from '~/actions/safe-action';
import { Caching, OrganizationCacheKey } from '~/data/caching';
import { updateDocumentTaskSchema } from '~/schemas/documents/update-document-task-schema';

export const updateDocumentTask = authOrganizationActionClient
  .metadata({ actionName: 'updateDocumentTask' })
  .inputSchema(updateDocumentTaskSchema)
  .action(async ({ parsedInput, ctx }) => {
    const [documentTask] = await db
      .select({ documentId: documentTaskTable.documentId })
      .from(documentTaskTable)
      .innerJoin(documentTable, eq(documentTaskTable.documentId, documentTable.id))
      .where(
        and(
          eq(documentTable.organizationId, ctx.organization.id),
          eq(documentTaskTable.id, parsedInput.id)
        )
      )
      .limit(1);

    if (!documentTask) {
      throw new NotFoundError('Document task not found');
    }

    await db
      .update(documentTaskTable)
      .set({
        title: parsedInput.title,
        description: parsedInput.description ? parsedInput.description : null,
        status: parsedInput.status,
        dueDate: parsedInput.dueDate ? parsedInput.dueDate : null
      })
      .where(eq(documentTaskTable.id, parsedInput.id));

    updateTag(
      Caching.createOrganizationTag(
        OrganizationCacheKey.DocumentTasks,
        ctx.organization.id,
        documentTask.documentId
      )
    );
  });
