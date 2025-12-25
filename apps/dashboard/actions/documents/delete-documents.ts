'use server';

import { updateTag } from 'next/cache';

import { and, db, eq, inArray } from '@workspace/database/client';
import { documentImageTable, documentTable } from '@workspace/database/schema';

import { authOrganizationActionClient } from '~/actions/safe-action';
import { Caching, OrganizationCacheKey } from '~/data/caching';
import { deleteDocumentsSchema } from '~/schemas/documents/delete-documents-schema';

export const deleteDocuments = authOrganizationActionClient
  .metadata({ actionName: 'deleteDocuments' })
  .inputSchema(deleteDocumentsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const documentIdsToDelete = parsedInput.ids;
    const organizationId = ctx.organization.id;

    await db.transaction(async (tx) => {
      await tx
        .delete(documentImageTable)
        .where(inArray(documentImageTable.documentId, documentIdsToDelete));

      await tx
        .delete(documentTable)
        .where(
          and(
            eq(documentTable.organizationId, organizationId),
            inArray(documentTable.id, documentIdsToDelete)
          )
        );
    });

    updateTag(
      Caching.createOrganizationTag(
        OrganizationCacheKey.Documents,
        organizationId
      )
    );

    for (const id of parsedInput.ids) {
      updateTag(
        Caching.createOrganizationTag(OrganizationCacheKey.Document, id)
      );
    }

    for (const membership of ctx.organization.memberships) {
      updateTag(
        Caching.createOrganizationTag(
          OrganizationCacheKey.Favorites,
          organizationId,
          membership.userId
        )
      );
    }
  });
