import * as React from 'react';

import { DocumentNotes } from '~/components/organizations/slug/documents/details/notes/document-notes';
import { getDocumentNotes } from '~/data/documents/get-document-notes';
import type { DocumentDto } from '~/types/dtos/document-dto';

export type DocumentNotesTabProps = {
  document: DocumentDto;
};

export async function DocumentNotesTab({
  document
}: DocumentNotesTabProps): Promise<React.JSX.Element> {
  const notes = await getDocumentNotes({ documentId: document.id });
  return (
    <DocumentNotes
      document={document}
      notes={notes}
    />
  );
}
