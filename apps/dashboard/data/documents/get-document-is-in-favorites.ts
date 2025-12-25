import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { getAuthOrganizationContext } from '@workspace/auth/context';
import { ValidationError } from '@workspace/common/errors';
import { and, db, eq } from '@workspace/database/client';
import { favoriteTable } from '@workspace/database/schema';

import { Caching, OrganizationCacheKey, UserCacheKey } from '~/data/caching';
import {
  getDocumentIsInFavoritesSchema,
  type GetDocumentAddedToFavoritesSchema
} from '~/schemas/documents/get-document-is-in-favorites-schema';

async function getDocumentIsInFavoritesData(
  userId: string,
  organizationId: string,
  documentId: string
): Promise<boolean> {
  'use cache';
  cacheLife('default');
  cacheTag(
    Caching.createUserTag(
      UserCacheKey.DocumentIsInFavorites,
      userId,
      documentId
    )
  );
  cacheTag(
    Caching.createOrganizationTag(
      OrganizationCacheKey.Favorites,
      organizationId,
      userId
    )
  );

  const [favorite] = await db
    .select({})
    .from(favoriteTable)
    .where(
      and(
        eq(favoriteTable.userId, userId),
        eq(favoriteTable.documentId, documentId)
      )
    )
    .limit(1);

  return !!favorite;
}

export async function getDocumentIsInFavorites(
  input: GetDocumentAddedToFavoritesSchema
): Promise<boolean> {
  const ctx = await getAuthOrganizationContext();

  const result = getDocumentIsInFavoritesSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(JSON.stringify(result.error.flatten()));
  }

  return getDocumentIsInFavoritesData(
    ctx.session.user.id,
    ctx.organization.id,
    result.data.documentId
  );
}
