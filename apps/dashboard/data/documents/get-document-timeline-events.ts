import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { getAuthOrganizationContext } from '@workspace/auth/context';
import { ValidationError } from '@workspace/common/errors';
import { and, db, desc, eq, inArray } from '@workspace/database/client';
import {
  ActorType,
  documentActivityTable,
  documentCommentTable,
  documentTable,
  userTable
} from '@workspace/database/schema';

import { Caching, OrganizationCacheKey } from '~/data/caching';
import {
  getDocumentTimelineEventsSchema,
  type GetDocumentTimelineEventsSchema
} from '~/schemas/documents/get-document-timeline-events-schema';
import type {
  ActivityTimelineEventDto,
  CommentTimelineEventDto,
  TimelineEventDto
} from '~/types/dtos/timeline-event-dto';

async function getDocumentTimelineEventsData(
  organizationId: string,
  documentId: string
): Promise<TimelineEventDto[]> {
  'use cache';
  cacheLife('default');
  cacheTag(
    Caching.createOrganizationTag(
      OrganizationCacheKey.DocumentTimelineEvents,
      organizationId,
      documentId
    )
  );
  cacheTag(
    Caching.createOrganizationTag(
      OrganizationCacheKey.Document,
      organizationId,
      documentId
    )
  );
  cacheTag(
    Caching.createOrganizationTag(
      OrganizationCacheKey.Documents,
      organizationId
    )
  );

  const activities = await db
    .select({
      id: documentActivityTable.id,
      documentId: documentActivityTable.documentId,
      actionType: documentActivityTable.actionType,
      actorType: documentActivityTable.actorType,
      actorId: documentActivityTable.actorId,
      metadata: documentActivityTable.metadata,
      occurredAt: documentActivityTable.occurredAt
    })
    .from(documentActivityTable)
    .innerJoin(
      documentTable,
      eq(documentActivityTable.documentId, documentTable.id)
    )
    .where(
      and(
        eq(documentTable.organizationId, organizationId),
        eq(documentActivityTable.documentId, documentId)
      )
    );

  const comments = await db
    .select({
      id: documentCommentTable.id,
      documentId: documentCommentTable.documentId,
      text: documentCommentTable.text,
      createdAt: documentCommentTable.createdAt,
      updatedAt: documentCommentTable.updatedAt,
      userId: documentCommentTable.userId,
      user: {
        id: userTable.id,
        name: userTable.name,
        image: userTable.image
      }
    })
    .from(documentCommentTable)
    .innerJoin(
      documentTable,
      eq(documentCommentTable.documentId, documentTable.id)
    )
    .innerJoin(userTable, eq(userTable.id, documentCommentTable.userId))
    .where(
      and(
        eq(documentTable.organizationId, organizationId),
        eq(documentCommentTable.documentId, documentId)
      )
    )
    .orderBy(desc(documentCommentTable.createdAt));

  const actorIds = [
    ...new Set(
      activities
        .filter((activity) => activity.actorType === ActorType.MEMBER)
        .map((activity) => activity.actorId)
    )
  ];
  const actors =
    actorIds.length > 0
      ? await db
          .select({
            id: userTable.id,
            name: userTable.name,
            image: userTable.image
          })
          .from(userTable)
          .where(inArray(userTable.id, actorIds))
      : [];

  const mappedActivities: ActivityTimelineEventDto[] = activities.map(
    (activity) => {
      const actor = actors.find((actor) => actor.id === activity.actorId);
      return {
        id: activity.id,
        documentId: activity.documentId,
        type: 'activity',
        actionType: activity.actionType,
        actorType: activity.actorType,
        metadata: activity.metadata,
        occurredAt: activity.occurredAt,
        actor: {
          id: actor?.id ?? '',
          name: actor?.name ?? '',
          image: actor?.image ?? undefined
        }
      };
    }
  );

  const mappedComments: CommentTimelineEventDto[] = comments.map((comment) => ({
    id: comment.id,
    documentId: comment.documentId,
    type: 'comment',
    text: comment.text,
    edited: comment.createdAt.getTime() !== comment.updatedAt.getTime(),
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    sender: {
      id: comment.user.id,
      name: comment.user.name,
      image: comment.user.image ?? undefined
    }
  }));

  const sorted: TimelineEventDto[] = [
    ...mappedActivities,
    ...mappedComments
  ].sort((a, b) => {
    const dateA = (
      a.type === 'activity' ? a.occurredAt : a.createdAt
    ).getTime();
    const dateB = (
      b.type === 'activity' ? b.occurredAt : b.createdAt
    ).getTime();
    return dateB - dateA;
  });

  return sorted;
}

export async function getDocumentTimelineEvents(
  input: GetDocumentTimelineEventsSchema
): Promise<TimelineEventDto[]> {
  const ctx = await getAuthOrganizationContext();

  const result = getDocumentTimelineEventsSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(JSON.stringify(result.error.flatten()));
  }

  return getDocumentTimelineEventsData(
    ctx.organization.id,
    result.data.documentId
  );
}
