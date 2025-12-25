import * as React from 'react';

import { LeastVisitedDocumentsSkeletonCard } from '~/components/organizations/slug/home/least-visited-documents-skeleton-card';

export default function LeastVisitedDocumentsLoading(): React.JSX.Element {
  return (
    <LeastVisitedDocumentsSkeletonCard className="col-span-2 md:col-span-1" />
  );
}
