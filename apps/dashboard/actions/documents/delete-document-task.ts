'use server';

import { updateTag } from 'next/cache';

import { NotFoundError } from '@workspace/common/errors';
import { and, db, eq } from '@workspace/database/client';
import { documentTable, documentTaskTable } from '@workspace/database/schema';

import { authOrganizationActionClient } from '~/actions/safe-action';
import { Caching, OrganizationCacheKey } from '~/data/caching';
import { deleteDocumentTaskSchema } from '~/schemas/documents/delete-document-task-schema';

export const deleteDocumentTask = authOrganizationActionClient
  .metadata({ actionName: 'deleteDocumentTask' })
  .inputSchema(deleteDocumentTaskSchema)
  .action(async ({ parsedInput, ctx }) => {
    const [documentTask] = await db
      .select({ documentId: documentTaskTable.documentId })
      .from(documentTaskTable)
      .innerJoin(
        documentTable,
        eq(documentTaskTable.documentId, documentTable.id)
      )
      .where(
        and(
          eq(documentTable.organizationId, ctx.organization.id),
          eq(documentTaskTable.id, parsedInput.id)
        )
      )
      .limit(1);

    if (!documentTask) {
      throw new NotFoundError('Task not found');
    }

    await db
      .delete(documentTaskTable)
      .where(eq(documentTaskTable.id, parsedInput.id));

    updateTag(
      Caching.createOrganizationTag(
        OrganizationCacheKey.DocumentTasks,
        ctx.organization.id,
        documentTask.documentId
      )
    );
  });
