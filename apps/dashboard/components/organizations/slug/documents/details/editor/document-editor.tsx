'use client';

import * as React from 'react';

import { NusomaEditor } from '@workspace/editor';

import type { DocumentDto } from '~/types/dtos/document-dto';

export type DocumentEditorProps = {
  document: DocumentDto;
};

export function DocumentEditor({
  document
}: DocumentEditorProps): React.JSX.Element {
  const slug = document.id;
  return <NusomaEditor room={slug} />;
}
