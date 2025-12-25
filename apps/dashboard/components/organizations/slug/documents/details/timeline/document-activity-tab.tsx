import * as React from 'react';

import { DocumentActivity } from '~/components/organizations/slug/documents/details/timeline/document-activity';
import { getProfile } from '~/data/account/get-profile';
import { getDocumentTimelineEvents } from '~/data/documents/get-document-timeline-events';
import type { DocumentDto } from '~/types/dtos/document-dto';

export type DocumentActivityTabProps = {
  document: DocumentDto;
};

export async function DocumentActivityTab({
  document
}: DocumentActivityTabProps): Promise<React.JSX.Element> {
  const [profile, events] = await Promise.all([
    getProfile(),
    getDocumentTimelineEvents({ documentId: document.id })
  ]);

  return (
    <DocumentActivity
      profile={profile}
      document={document}
      events={events}
    />
  );
}
