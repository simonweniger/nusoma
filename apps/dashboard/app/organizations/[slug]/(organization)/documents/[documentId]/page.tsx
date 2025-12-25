import * as React from 'react';
import { type Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createSearchParamsCache, parseAsString } from 'nuqs/server';

import { routes } from '@workspace/routes';
import {
  Page,
  PageBody,
  PageHeader,
  PagePrimaryBar
} from '@workspace/ui/components/page';

import { DocumentActions } from '~/components/organizations/slug/documents/details/document-actions';
import { DocumentMeta } from '~/components/organizations/slug/documents/details/document-meta';
import { DocumentPageVisit } from '~/components/organizations/slug/documents/details/document-page-visit';
import { DocumentTabs } from '~/components/organizations/slug/documents/details/document-tabs';
import { OrganizationPageTitle } from '~/components/organizations/slug/organization-page-title';
import { getDocument } from '~/data/documents/get-document';
import { createTitle } from '~/lib/formatters';

const dedupedGetDocument = React.cache(getDocument);

const paramsCache = createSearchParamsCache({
  documentId: parseAsString.withDefault('')
});

export async function generateMetadata({
  params
}: NextPageProps): Promise<Metadata> {
  const { documentId } = await paramsCache.parse(params);

  if (documentId) {
    const document = await dedupedGetDocument({
      id: documentId
    });
    if (document) {
      return {
        title: createTitle(document.name)
      };
    }
  }

  return {
    title: createTitle('Document')
  };
}

export default async function DocumentPage({
  params
}: NextPageProps): Promise<React.JSX.Element> {
  const { documentId } = await paramsCache.parse(params);
  if (!documentId) {
    return notFound();
  }

  const document = await dedupedGetDocument({
    id: documentId
  });

  return (
    <Page>
      <PageHeader>
        <PagePrimaryBar>
          <OrganizationPageTitle
            index={{
              route: routes.dashboard.organizations.slug.Documents,
              title: 'Documents'
            }}
            title={document.name}
          />
          <DocumentActions document={document} />
        </PagePrimaryBar>
      </PageHeader>
      <PageBody
        disableScroll
        className="flex h-full flex-col overflow-auto md:flex-row md:divide-x md:overflow-hidden"
      >
        <DocumentPageVisit document={document} />
        <DocumentMeta document={document} />
        <DocumentTabs document={document} />
      </PageBody>
    </Page>
  );
}
