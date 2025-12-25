'use client';

import * as React from 'react';

import { addDocumentPageVisit } from '~/actions/documents/add-document-page-visit';
import { useRunOnce } from '~/hooks/use-run-once';
import type { DocumentDto } from '~/types/dtos/document-dto';

export type DocumentPageVisitProps = {
  document: DocumentDto;
};

export function DocumentPageVisit({
  document
}: DocumentPageVisitProps): React.JSX.Element {
  useRunOnce(() => addDocumentPageVisit({ documentId: document.id }));
  return <></>;
}
