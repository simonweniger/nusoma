import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { getAuthOrganizationContext } from '@workspace/auth/context';
import { ValidationError } from '@workspace/common/errors';
import { and, asc, db, eq } from '@workspace/database/client';
import { documentTable, documentTaskTable } from '@workspace/database/schema';

import { Caching, OrganizationCacheKey } from '~/data/caching';
import {
  getDocumentTasksSchema,
  type GetDocumentTasksSchema
} from '~/schemas/documents/get-document-tasks-schema';
import type { DocumentTaskDto } from '~/types/dtos/document-task-dto';

async function getDocumentTasksData(
  organizationId: string,
  documentId: string
): Promise<DocumentTaskDto[]> {
  'use cache';
  cacheLife('default');
  cacheTag(
    Caching.createOrganizationTag(
      OrganizationCacheKey.DocumentTasks,
      organizationId,
      documentId
    )
  );

  const documentTasks = await db
    .select({
      id: documentTaskTable.id,
      documentId: documentTaskTable.documentId,
      title: documentTaskTable.title,
      description: documentTaskTable.description,
      status: documentTaskTable.status,
      dueDate: documentTaskTable.dueDate,
      createdAt: documentTaskTable.createdAt
    })
    .from(documentTaskTable)
    .innerJoin(
      documentTable,
      eq(documentTaskTable.documentId, documentTable.id)
    )
    .where(
      and(
        eq(documentTable.organizationId, organizationId),
        eq(documentTaskTable.documentId, documentId)
      )
    )
    .orderBy(asc(documentTaskTable.createdAt));

  return documentTasks.map((task) => ({
    id: task.id,
    documentId: task.documentId ?? undefined,
    title: task.title,
    description: task.description ?? undefined,
    status: task.status,
    dueDate: task.dueDate ?? undefined,
    createdAt: task.createdAt
  }));
}

export async function getDocumentTasks(
  input: GetDocumentTasksSchema
): Promise<DocumentTaskDto[]> {
  const ctx = await getAuthOrganizationContext();

  const result = getDocumentTasksSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(JSON.stringify(result.error.flatten()));
  }

  return getDocumentTasksData(ctx.organization.id, result.data.documentId);
}
