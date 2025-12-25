import * as React from 'react';

import { searchParamsCache } from '~/components/organizations/slug/home/home-search-params';
import { LeastVisitedDocumentsCard } from '~/components/organizations/slug/home/least-visited-documents-card';
import { getLeastVisitedDocuments } from '~/data/home/get-least-visited-documents';

export default async function LeastVisitedDocumentsPage({
  searchParams
}: NextPageProps): Promise<React.JSX.Element> {
  const parsedSearchParams = await searchParamsCache.parse(searchParams);
  const documents = await getLeastVisitedDocuments(parsedSearchParams);

  return (
    <LeastVisitedDocumentsCard
      documents={documents}
      className="col-span-2 md:col-span-1"
    />
  );
}
