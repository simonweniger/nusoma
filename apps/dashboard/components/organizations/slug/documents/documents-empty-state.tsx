import * as React from 'react';
import { UsersIcon } from 'lucide-react';

import { EmptyState } from '@workspace/ui/components/empty-state';

import { AddDocumentButton } from '~/components/organizations/slug/documents/add-document-button';

export function DocumentsEmptyState(): React.JSX.Element {
  return (
    <div className="p-6">
      <EmptyState
        icon={
          <div className="flex size-12 items-center justify-center rounded-md border">
            <UsersIcon className="size-6 shrink-0 text-muted-foreground" />
          </div>
        }
        title="No document yet"
        description="Add documents and they will show up here."
      >
        <AddDocumentButton />
      </EmptyState>
    </div>
  );
}
