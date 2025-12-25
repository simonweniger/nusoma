'use client';

import * as React from 'react';
import NiceModal from '@ebay/nice-modal-react';
import { FilePlus2Icon } from 'lucide-react';

import { Button } from '@workspace/ui/components/button';
import { EmptyText } from '@workspace/ui/components/empty-text';
import { ResponsiveScrollArea } from '@workspace/ui/components/scroll-area';
import { MediaQueries } from '@workspace/ui/lib/media-queries';

import { AddDocumentNoteModal } from '~/components/organizations/slug/documents/details/notes/add-document-note-modal';
import { DocumentNoteCard } from '~/components/organizations/slug/documents/details/notes/document-note-card';
import type { DocumentDto } from '~/types/dtos/document-dto';
import type { DocumentNoteDto } from '~/types/dtos/document-note-dto';

export type DocumentNotesProps = {
  document: DocumentDto;
  notes: DocumentNoteDto[];
};

export function DocumentNotes({
  document,
  notes
}: DocumentNotesProps): React.JSX.Element {
  const handleShowAddDocumentNoteModal = async (): Promise<void> => {
    NiceModal.show(AddDocumentNoteModal, { documentId: document.id });
  };
  return (
    <ResponsiveScrollArea
      breakpoint={MediaQueries.MdUp}
      mediaQueryOptions={{ ssr: true }}
      className="h-full"
    >
      <div className="flex h-14 flex-row items-center justify-between gap-2 px-6">
        <h1 className="text-sm font-semibold">
          All notes{' '}
          <span className="text-muted-foreground">({notes.length})</span>
        </h1>
        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={handleShowAddDocumentNoteModal}
        >
          <FilePlus2Icon className="size-4 shrink-0" />
          Add note
        </Button>
      </div>
      <div className="h-full p-6 pt-0">
        {notes.length > 0 ? (
          <div className="grid size-full grid-cols-1 gap-12 sm:grid-cols-2 2xl:grid-cols-3">
            {notes.map((note) => (
              <DocumentNoteCard
                key={note.id}
                note={note}
                className="h-[300px]"
              />
            ))}
          </div>
        ) : (
          <EmptyText>
            There are no associated notes with this document.
          </EmptyText>
        )}
      </div>
    </ResponsiveScrollArea>
  );
}
