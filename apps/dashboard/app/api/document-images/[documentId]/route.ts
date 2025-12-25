import { NextResponse, type NextRequest } from 'next/server';
import { createSearchParamsCache, parseAsString } from 'nuqs/server';
import { validate as uuidValidate } from 'uuid';

import { db, eq } from '@workspace/database/client';
import { documentImageTable } from '@workspace/database/schema';

const paramsCache = createSearchParamsCache({
  documentId: parseAsString.withDefault('')
});

export async function GET(
  req: NextRequest,
  props: { params: Promise<NextParams> }
): Promise<Response> {
  const { documentId } = await paramsCache.parse(props.params);
  if (!documentId || !uuidValidate(documentId)) {
    return new NextResponse(undefined, {
      status: 400,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  }

  const [documentImage] = await db.transaction(
    async (tx) =>
      await tx
        .select({
          data: documentImageTable.data,
          contentType: documentImageTable.contentType,
          hash: documentImageTable.hash
        })
        .from(documentImageTable)
        .where(eq(documentImageTable.documentId, documentId)),
    { isolationLevel: 'read uncommitted' }
  );

  if (!documentImage || !documentImage.data) {
    return new NextResponse(undefined, {
      status: 404,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  }

  const { searchParams } = new URL(req.url);
  const version = searchParams.get('v');
  if (version && version !== documentImage.hash) {
    return new NextResponse(undefined, {
      status: 400,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  }

  return new NextResponse(Buffer.from(documentImage.data), {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=86400, immutable',
      'Content-Type': documentImage.contentType ?? 'image/png',
      'Content-Length': documentImage.data.length.toString()
    }
  });
}
