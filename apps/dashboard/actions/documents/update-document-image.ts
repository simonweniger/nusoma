'use server';

import { createHash } from 'crypto';
import { updateTag } from 'next/cache';

import { NotFoundError } from '@workspace/common/errors';
import { decodeBase64Image, resizeImage } from '@workspace/common/image';
import type { Maybe } from '@workspace/common/maybe';
import { and, db, eq } from '@workspace/database/client';
import { documentImageTable, documentTable } from '@workspace/database/schema';
import { getDocumentImageUrl } from '@workspace/routes';

import { updateDocumentAndCaptureEvent } from '~/actions/documents/_document-event-capture';
import { authOrganizationActionClient } from '~/actions/safe-action';
import { Caching, OrganizationCacheKey } from '~/data/caching';
import { FileUploadAction } from '~/lib/file-upload';
import { updateDocumentImageSchema } from '~/schemas/documents/update-document-image-schema';

export const updateDocumentImage = authOrganizationActionClient
  .metadata({ actionName: 'updateDocumentImage' })
  .inputSchema(updateDocumentImageSchema)
  .action(async ({ parsedInput, ctx }) => {
    const [document] = await db
      .select({})
      .from(documentTable)
      .where(
        and(
          eq(documentTable.organizationId, ctx.organization.id),
          eq(documentTable.id, parsedInput.id)
        )
      )
      .limit(1);

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    let imageUrl: Maybe<string> = undefined;

    if (parsedInput.action === FileUploadAction.Update && parsedInput.image) {
      const { buffer, mimeType } = decodeBase64Image(parsedInput.image);
      const data = await resizeImage(buffer, mimeType);
      const hash = createHash('sha256').update(data).digest('hex');

      await db.transaction(async (tx) => {
        await tx
          .delete(documentImageTable)
          .where(eq(documentImageTable.documentId, parsedInput.id));

        await tx.insert(documentImageTable).values({
          documentId: parsedInput.id,
          data,
          contentType: mimeType,
          hash
        });
      });

      imageUrl = getDocumentImageUrl(parsedInput.id, hash);
    }

    if (parsedInput.action === FileUploadAction.Delete) {
      await db
        .delete(documentImageTable)
        .where(eq(documentImageTable.documentId, parsedInput.id));
      imageUrl = null;
    }

    await updateDocumentAndCaptureEvent(
      parsedInput.id,
      { image: imageUrl },
      ctx.session.user.id
    );

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
