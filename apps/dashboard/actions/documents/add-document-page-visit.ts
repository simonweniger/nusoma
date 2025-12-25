'use server';

import { updateTag } from 'next/cache';

import { NotFoundError } from '@workspace/common/errors';
import { db, eq } from '@workspace/database/client';
import {
  documentPageVisitTable,
  documentTable
} from '@workspace/database/schema';

import { authOrganizationActionClient } from '~/actions/safe-action';
import { Caching, OrganizationCacheKey } from '~/data/caching';
import { addDocumentPageVisitSchema } from '~/schemas/documents/add-document-page-visit-schema';

export const addDocumentPageVisit = authOrganizationActionClient
  .metadata({ actionName: 'addDocumentPageVisit' })
  .inputSchema(addDocumentPageVisitSchema)
  .action(async ({ parsedInput, ctx }) => {
    const [document] = await db
      .select({})
      .from(documentTable)
      .where(eq(documentTable.id, parsedInput.documentId))
      .limit(1);

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    await db.insert(documentPageVisitTable).values({
      documentId: parsedInput.documentId,
      userId: ctx.session.user.id
    });

    updateTag(
      Caching.createOrganizationTag(
        OrganizationCacheKey.DocumentPageVisits,
        ctx.organization.id
      )
    );
  });
