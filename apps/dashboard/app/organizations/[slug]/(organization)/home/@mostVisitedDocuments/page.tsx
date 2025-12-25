import * as React from 'react';

import { searchParamsCache } from '~/components/organizations/slug/home/home-search-params';
import { MostVisitedDocumentsCard } from '~/components/organizations/slug/home/most-visited-documents-card';
import { getMostVisitedDocuments } from '~/data/home/get-most-visited-documents';

export default async function MostVisitedDocumentsPage({
  searchParams
}: NextPageProps): Promise<React.JSX.Element> {
  const parsedSearchParams = await searchParamsCache.parse(searchParams);
  const documents = await getMostVisitedDocuments(parsedSearchParams);

  return (
    <MostVisitedDocumentsCard
      documents={documents}
      className="col-span-2 md:col-span-1"
    />
  );
}
