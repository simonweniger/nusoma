import * as React from 'react';

import { DocumentEditor } from '~/components/organizations/slug/documents/details/editor/document-editor';
import type { DocumentDto } from '~/types/dtos/document-dto';

export type DocumentEditorTabProps = {
  document: DocumentDto;
};

export async function DocumentEditorTab({
  document
}: DocumentEditorTabProps): Promise<React.JSX.Element> {
  return <DocumentEditor document={document} />;
}
