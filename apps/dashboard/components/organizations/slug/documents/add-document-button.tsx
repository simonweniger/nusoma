'use client';

import * as React from 'react';
import NiceModal from '@ebay/nice-modal-react';

import { Button } from '@workspace/ui/components/button';

import { AddDocumentModal } from '~/components/organizations/slug/documents/add-document-modal';

export function AddDocumentButton(): React.JSX.Element {
  const handleShowAddDocumentModal = (): void => {
    NiceModal.show(AddDocumentModal);
  };
  return (
    <Button
      type="button"
      variant="default"
      size="default"
      className="whitespace-nowrap"
      onClick={handleShowAddDocumentModal}
    >
      Add document
    </Button>
  );
}
