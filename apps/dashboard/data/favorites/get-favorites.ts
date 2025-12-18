import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { getAuthOrganizationContext } from '@workspace/auth/context';
import { and, asc, db, eq } from '@workspace/database/client';
import { contactTable, favoriteTable } from '@workspace/database/schema';

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
      contact: {
        id: contactTable.id,
        name: contactTable.name,
        record: contactTable.record,
        image: contactTable.image
      }
    })
    .from(favoriteTable)
    .innerJoin(contactTable, eq(favoriteTable.contactId, contactTable.id))
    .where(
      and(
        eq(contactTable.organizationId, organizationId),
        eq(favoriteTable.userId, userId)
      )
    )
    .orderBy(asc(favoriteTable.order));

  return favorites.map((favorite) => ({
    id: favorite.id,
    order: favorite.order,
    contactId: favorite.contact.id,
    name: favorite.contact.name,
    record: favorite.contact.record,
    image: favorite.contact.image ? favorite.contact.image : undefined
  }));
}

export async function getFavorites(): Promise<FavoriteDto[]> {
  const ctx = await getAuthOrganizationContext();
  return getFavoritesData(ctx.organization.id, ctx.session.user.id);
}
