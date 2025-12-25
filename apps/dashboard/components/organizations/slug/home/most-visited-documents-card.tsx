import * as React from 'react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  type CardProps
} from '@workspace/ui/components/card';
import { EmptyText } from '@workspace/ui/components/empty-text';

import { VisitedDocumentList } from '~/components/organizations/slug/home/visited-document-list';
import type { VisitedDocumentDto } from '~/types/dtos/visited-document-dto';

export type MostVisitedDocumentsCardProps = CardProps & {
  documents: VisitedDocumentDto[];
};

export function MostVisitedDocumentsCard({
  documents,
  ...props
}: MostVisitedDocumentsCardProps): React.JSX.Element {
  const hasDocuments = documents.length > 0;
  return (
    <Card {...props}>
      <CardHeader className="gap-0">
        <CardTitle className="text-sm">Most visited documents</CardTitle>
      </CardHeader>
      <CardContent>
        {hasDocuments ? (
          <VisitedDocumentList documents={documents} />
        ) : (
          <EmptyText>There's no data available for your selection.</EmptyText>
        )}
      </CardContent>
    </Card>
  );
}
