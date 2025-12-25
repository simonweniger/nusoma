import { NextRequest, NextResponse } from 'next/server';
import type { Column } from 'exceljs';
import { Workbook } from 'exceljs';

import { dedupedAuth } from '@workspace/auth';
import { checkSession } from '@workspace/auth/session';
import {
  and,
  count,
  db,
  eq,
  inArray,
  jsonAggBuildObject
} from '@workspace/database/client';
import {
  documentTable,
  documentTagTable,
  documentToDocumentTagTable,
  membershipTable
} from '@workspace/database/schema';

import { exportCsvDocumentListSchema } from '~/schemas/documents/export-csv-document-list-schema';

enum DocumentColumn {
  Name = 'name',
  Email = 'email',
  Phone = 'phone',
  Address = 'address',
  Tags = 'tags'
}

const columns: Partial<Column>[] = [
  { header: 'Name', key: DocumentColumn.Name },
  { header: 'Email', key: DocumentColumn.Email },
  { header: 'Phone', key: DocumentColumn.Phone },
  { header: 'Address', key: DocumentColumn.Address },
  { header: 'Tags', key: DocumentColumn.Tags }
];

type Row = {
  [DocumentColumn.Name]: string;
  [DocumentColumn.Email]: string;
  [DocumentColumn.Phone]: string;
  [DocumentColumn.Address]: string;
  [DocumentColumn.Tags]: string;
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await dedupedAuth();
  if (!checkSession(session)) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  }

  const body = await req.json();
  const bodyParsingResult = exportCsvDocumentListSchema.safeParse(body);
  if (!bodyParsingResult.success) {
    return new NextResponse(JSON.stringify(bodyParsingResult.error.flatten()), {
      status: 400,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  }
  const parsedBody = bodyParsingResult?.data ?? {};

  const membershipCount = await db
    .select({ count: count() })
    .from(membershipTable)
    .where(
      and(
        eq(membershipTable.organizationId, parsedBody.organizationId),
        eq(membershipTable.userId, session.user.id)
      )
    );

  if (membershipCount[0].count === 0) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  }

  const records = await db
    .select({
      name: documentTable.name,
      email: documentTable.email,
      phone: documentTable.phone,
      address: documentTable.address,
      tags: jsonAggBuildObject({
        text: documentTagTable.text
      })
    })
    .from(documentTable)
    .leftJoin(
      documentToDocumentTagTable,
      eq(documentTable.id, documentToDocumentTagTable.documentId)
    )
    .leftJoin(
      documentTagTable,
      eq(documentToDocumentTagTable.documentTagId, documentTagTable.id)
    )
    .where(
      and(
        eq(documentTable.organizationId, parsedBody.organizationId),
        parsedBody.ids ? inArray(documentTable.id, parsedBody.ids) : undefined
      )
    )
    .groupBy(documentTable.id);

  const now = new Date();
  const workbook = new Workbook();
  workbook.creator = session.user.name;
  workbook.lastModifiedBy = session.user.name;
  workbook.created = now;
  workbook.modified = now;
  const sheet = workbook.addWorksheet('Document List');
  sheet.columns = columns;

  for (const record of records) {
    const row: Row = {
      [DocumentColumn.Name]: record.name,
      [DocumentColumn.Email]: record.email ?? '',
      [DocumentColumn.Phone]: record.phone ?? '',
      [DocumentColumn.Address]: record.address ?? '',
      [DocumentColumn.Tags]: record.tags.map((t) => t.text).join(',')
    };
    sheet.addRow(row).commit();
  }

  const filename = 'document-list.xlsx';
  const headers = new Headers();
  headers.append('Cache-Control', 'no-store');
  headers.append(
    'Content-Disposition',
    `attachment; filename=${filename}; filename*=UTF-8''${filename}`
  );
  headers.append(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers
  });
}
