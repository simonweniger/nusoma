import * as React from 'react';

import { MostVisitedDocumentsSkeletonCard } from '~/components/organizations/slug/home/most-visited-documents-skeleton-card';

export default function MostVisitedDocumentsLoading(): React.JSX.Element {
  return (
    <MostVisitedDocumentsSkeletonCard className="col-span-2 md:col-span-1" />
  );
}
