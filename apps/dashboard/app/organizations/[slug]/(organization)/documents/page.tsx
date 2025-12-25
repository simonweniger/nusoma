import * as React from 'react';
import { type Metadata } from 'next';

import {
  Page,
  PageActions,
  PageBody,
  PageHeader,
  PagePrimaryBar,
  PageSecondaryBar
} from '@workspace/ui/components/page';

import { AddDocumentButton } from '~/components/organizations/slug/documents/add-document-button';
import { DocumentsDataTable } from '~/components/organizations/slug/documents/documents-data-table';
import { DocumentsEmptyState } from '~/components/organizations/slug/documents/documents-empty-state';
import { DocumentsFilters } from '~/components/organizations/slug/documents/documents-filters';
import { searchParamsCache } from '~/components/organizations/slug/documents/documents-search-params';
import { OrganizationPageTitle } from '~/components/organizations/slug/organization-page-title';
import { getDocumentTags } from '~/data/documents/get-document-tags';
import { getDocuments } from '~/data/documents/get-documents';
import { TransitionProvider } from '~/hooks/use-transition-context';
import { createTitle } from '~/lib/formatters';

export const metadata: Metadata = {
  title: createTitle('Documents')
};

export default async function DocumentsPage({
  searchParams
}: NextPageProps): Promise<React.JSX.Element> {
  const parsedSearchParams = await searchParamsCache.parse(searchParams);

  const [{ documents, filteredCount, totalCount }, tags] = await Promise.all([
    getDocuments(parsedSearchParams),
    getDocumentTags()
  ]);

  const hasAnyDocuments = totalCount > 0;

  return (
    <TransitionProvider>
      <Page>
        <PageHeader>
          <PagePrimaryBar>
            <OrganizationPageTitle
              title="Documents"
              info={`Total ${totalCount} ${totalCount === 1 ? 'document' : 'documents'} in your organization`}
            />
            {hasAnyDocuments && (
              <PageActions>
                <AddDocumentButton />
              </PageActions>
            )}
          </PagePrimaryBar>
          <PageSecondaryBar>
            <React.Suspense>
              <DocumentsFilters tags={tags} />
            </React.Suspense>
          </PageSecondaryBar>
        </PageHeader>
        <PageBody disableScroll={hasAnyDocuments}>
          {hasAnyDocuments ? (
            <React.Suspense>
              <DocumentsDataTable
                data={documents}
                totalCount={filteredCount}
              />
            </React.Suspense>
          ) : (
            <DocumentsEmptyState />
          )}
        </PageBody>
      </Page>
    </TransitionProvider>
  );
}
