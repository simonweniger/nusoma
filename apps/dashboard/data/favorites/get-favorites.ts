import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { getAuthOrganizationContext } from '@workspace/auth/context';
import { and, asc, db, eq } from '@workspace/database/client';
import { documentTable, favoriteTable } from '@workspace/database/schema';

import { Caching, OrganizationCacheKey } from '~/data/caching';
import type { FavoriteDto } from '~/types/dtos/favorite-dto';

async function getFavoritesData(
  organizationId: string,
  userId: string
): Promise<FavoriteDto[]> {
  'use cache';
  cacheLife('default');
  cacheTag(
    Caching.createOrganizationTag(
      OrganizationCacheKey.Favorites,
      organizationId,
      userId
    )
  );

  const favorites = await db
    .select({
      id: favoriteTable.id,
      order: favoriteTable.order,
      document: {
        id: documentTable.id,
        name: documentTable.name,
        record: documentTable.record,
        image: documentTable.image
      }
    })
    .from(favoriteTable)
    .innerJoin(documentTable, eq(favoriteTable.documentId, documentTable.id))
    .where(
      and(
        eq(documentTable.organizationId, organizationId),
        eq(favoriteTable.userId, userId)
      )
    )
    .orderBy(asc(favoriteTable.order));

  return favorites.map((favorite) => ({
    id: favorite.id,
    order: favorite.order,
    documentId: favorite.document.id,
    name: favorite.document.name,
    record: favorite.document.record,
    image: favorite.document.image ? favorite.document.image : undefined
  }));
}

export async function getFavorites(): Promise<FavoriteDto[]> {
  const ctx = await getAuthOrganizationContext();
  return getFavoritesData(ctx.organization.id, ctx.session.user.id);
}
