import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';
import { endOfDay, format, startOfDay } from 'date-fns';

import { getAuthOrganizationContext } from '@workspace/auth/context';
import { ValidationError } from '@workspace/common/errors';
import { db, sql } from '@workspace/database/client';
import { DocumentRecord, documentTable } from '@workspace/database/schema';

import { Caching, OrganizationCacheKey } from '~/data/caching';
import {
  getLeadGenerationDataSchema,
  type GetLeadGenerationDataSchema
} from '~/schemas/home/get-lead-generation-data-schema';
import type { LeadGenerationDataPointDto } from '~/types/dtos/lead-generation-data-point-dto';

async function getLeadGenerationDataCached(
  organizationId: string,
  from: Date,
  to: Date
): Promise<LeadGenerationDataPointDto[]> {
  'use cache';
  cacheLife('default');
  cacheTag(
    Caching.createOrganizationTag(
      OrganizationCacheKey.LeadGenerationData,
      organizationId
    )
  );
  cacheTag(
    Caching.createOrganizationTag(OrganizationCacheKey.Documents, organizationId)
  );

  const documents = await db
    .select({
      record: documentTable.record,
      createdAt: documentTable.createdAt
    })
    .from(documentTable)
    .where(
      sql`${documentTable.organizationId} = ${organizationId} 
      AND ${documentTable.createdAt} BETWEEN ${startOfDay(from)} AND ${endOfDay(to)}`
    );

  const dataPointsByDate = Object.values(
    documents.reduce(
      (acc, { record, createdAt }) => {
        const date = format(createdAt, 'yyyy-MM-dd');
        acc[date] = acc[date] || { date, people: 0, companies: 0 };
        acc[date][record === DocumentRecord.PERSON ? 'people' : 'companies']++;

        return acc;
      },
      {} as Record<string, LeadGenerationDataPointDto>
    )
  );

  return dataPointsByDate.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

export async function getLeadGenerationData(
  input: GetLeadGenerationDataSchema
): Promise<LeadGenerationDataPointDto[]> {
  const ctx = await getAuthOrganizationContext();

  const result = getLeadGenerationDataSchema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(JSON.stringify(result.error.flatten()));
  }

  return getLeadGenerationDataCached(
    ctx.organization.id,
    result.data.from,
    result.data.to
  );
}
