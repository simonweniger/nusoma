import * as React from 'react';

import { DocumentActionsDropdown } from '~/components/organizations/slug/documents/details/document-actions-dropdown';
import { DocumentFavoriteToggle } from '~/components/organizations/slug/documents/details/document-favorite-toggle';
import { getDocumentIsInFavorites } from '~/data/documents/get-document-is-in-favorites';
import type { DocumentDto } from '~/types/dtos/document-dto';

export type DocumentActionsProps = React.HtmlHTMLAttributes<HTMLDivElement> & {
  document: DocumentDto;
};

export async function DocumentActions({
  document
}: DocumentActionsProps): Promise<React.JSX.Element> {
  const addedToFavorites = await getDocumentIsInFavorites({
    documentId: document.id
  });

  return (
    <div className="flex flex-row items-center gap-2">
      <DocumentFavoriteToggle
        document={document}
        addedToFavorites={addedToFavorites}
      />
      <DocumentActionsDropdown
        document={document}
        addedToFavorites={addedToFavorites}
      />
    </div>
  );
}
