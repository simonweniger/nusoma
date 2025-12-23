import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { getAuthOrganizationContext } from '@workspace/auth/context';
import { ValidationError } from '@workspace/common/errors';
import { and, asc, db, eq } from '@workspace/database/client';
import { contactTable, contactTaskTable } from '@workspace/database/schema';

import { Caching, OrganizationCacheKey } from '~/data/caching';
import {
  getContactTasksSchema,
  type GetContactTasksSchema
} from '~/schemas/contacts/get-contact-tasks-schema';
import type { ContactTaskDto } from '~/types/dtos/contact-task-dto';

async function getContactTasksData(
  organizationId: string,
  contactId: string
): Promise<ContactTaskDto[]> {
  'use cache';
  cacheLife('default');
  cacheTag(
    Caching.createOrganizationTag(
      OrganizationCacheKey.ContactTasks,
      organizationId,
      contactId
    )
  );

  const contactTasks = await db
    .select({
      id: contactTaskTable.id,
      contactId: contactTaskTable.contactId,
      title: contactTaskTable.title,
      description: contactTaskTable.description,
      status: contactTaskTable.status,
      dueDate: contactTaskTable.dueDate,
      createdAt: contactTaskTable.createdAt
    })
    .from(contactTaskTable)
    .innerJoin(contactTable, eq(contactTaskTable.contactId, contactTable.id))
    .where(
      and(
        eq(contactTable.organizationId, organizationId),
        eq(contactTaskTable.contactId, contactId)
      )
    )
    .orderBy(asc(contactTaskTable.createdAt));

  return contactTasks.map((task) => ({
    id: task.id,
    contactId: task.contactId ?? undefined,
    title: task.title,
    description: task.description ?? undefined,
    status: task.status,
    dueDate: task.dueDate ?? undefined,
    createdAt: task.createdAt
  }));
}

export async function getContactTasks(
  input: GetContactTasksSchema
): Promise<ContactTaskDto[]> {
  const ctx = await getAuthOrganizationContext();

  const result = getContactTasksSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(JSON.stringify(result.error.flatten()));
  }

  return getContactTasksData(ctx.organization.id, result.data.contactId);
}
