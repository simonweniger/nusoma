import * as React from 'react';

import { DocumentTasks } from '~/components/organizations/slug/documents/details/tasks/document-tasks';
import { getDocumentTasks } from '~/data/documents/get-document-tasks';
import type { DocumentDto } from '~/types/dtos/document-dto';

export type DocumentTasksTabProps = {
  document: DocumentDto;
};

export async function DocumentTasksTab({
  document
}: DocumentTasksTabProps): Promise<React.JSX.Element> {
  const tasks = await getDocumentTasks({ documentId: document.id });
  return (
    <DocumentTasks
      document={document}
      tasks={tasks}
    />
  );
}
