'use client';

import * as React from 'react';

import { ResponsiveScrollArea } from '@workspace/ui/components/scroll-area';
import { MediaQueries } from '@workspace/ui/lib/media-queries';

import { DocumentDetailsSection } from '~/components/organizations/slug/documents/details/document-details-section';
import { DocumentStageSection } from '~/components/organizations/slug/documents/details/document-stage-section';
import { DocumentTagsSection } from '~/components/organizations/slug/documents/details/document-tags-section';
import type { DocumentDto } from '~/types/dtos/document-dto';

export type DocumentMetaProps = {
  document: DocumentDto;
};

export function DocumentMeta({
  document
}: DocumentMetaProps): React.JSX.Element {
  return (
    <ResponsiveScrollArea
      breakpoint={MediaQueries.MdUp}
      mediaQueryOptions={{ ssr: true }}
      className="sm:h-full"
    >
      <div className="size-full divide-y border-b md:w-[360px] md:min-w-[360px]">
        <DocumentDetailsSection document={document} />
        <DocumentStageSection document={document} />
        <DocumentTagsSection document={document} />
      </div>
    </ResponsiveScrollArea>
  );
}
