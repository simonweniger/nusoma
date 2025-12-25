'use server';

import { updateTag } from 'next/cache';

import { NotFoundError } from '@workspace/common/errors';
import { and, db, eq } from '@workspace/database/client';
import { documentImageTable, documentTable } from '@workspace/database/schema';

import { authOrganizationActionClient } from '~/actions/safe-action';
import { Caching, OrganizationCacheKey } from '~/data/caching';
import { deleteDocumentSchema } from '~/schemas/documents/delete-document-schema';

export const deleteDocument = authOrganizationActionClient
  .metadata({ actionName: 'deleteDocument' })
  .inputSchema(deleteDocumentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const [document] = await db
      .select({})
      .from(documentTable)
      .where(
        and(
          eq(documentTable.id, parsedInput.id),
          eq(documentTable.organizationId, ctx.organization.id)
        )
      )
      .limit(1);

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(documentImageTable)
        .where(eq(documentImageTable.documentId, parsedInput.id));

      await tx
        .delete(documentTable)
        .where(eq(documentTable.id, parsedInput.id));
    });

    updateTag(
      Caching.createOrganizationTag(
        OrganizationCacheKey.Documents,
        ctx.organization.id
      )
    );

    updateTag(
      Caching.createOrganizationTag(
        OrganizationCacheKey.Document,
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
