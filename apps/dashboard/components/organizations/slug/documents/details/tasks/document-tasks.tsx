'use client';

import * as React from 'react';
import NiceModal from '@ebay/nice-modal-react';
import { CheckSquare2Icon } from 'lucide-react';

import { DocumentTaskStatus } from '@workspace/database/schema';
import { Button } from '@workspace/ui/components/button';
import { EmptyText } from '@workspace/ui/components/empty-text';
import { ResponsiveScrollArea } from '@workspace/ui/components/scroll-area';
import { MediaQueries } from '@workspace/ui/lib/media-queries';

import { AddDocumentTaskModal } from '~/components/organizations/slug/documents/details/tasks/add-document-task-modal';
import { DocumentTaskList } from '~/components/organizations/slug/documents/details/tasks/document-task-list';
import type { DocumentDto } from '~/types/dtos/document-dto';
import type { DocumentTaskDto } from '~/types/dtos/document-task-dto';

export type DocumentTasksProps = {
  document: DocumentDto;
  tasks: DocumentTaskDto[];
};

export function DocumentTasks({
  document,
  tasks
}: DocumentTasksProps): React.JSX.Element {
  const openTasks = tasks.filter(
    (task) => task.status === DocumentTaskStatus.OPEN
  );
  const completedTasks = tasks.filter(
    (task) => task.status === DocumentTaskStatus.COMPLETED
  );
  const handleShowAddTaskModal = (): void => {
    NiceModal.show(AddDocumentTaskModal, { documentId: document.id });
  };
  return (
    <ResponsiveScrollArea
      breakpoint={MediaQueries.MdUp}
      mediaQueryOptions={{ ssr: true }}
      className="h-full"
    >
      <div className="divide-y border-b">
        <div className="flex h-14 flex-row items-center justify-between gap-2 px-6">
          <h1 className="text-sm font-semibold">
            All tasks{' '}
            <span className="text-muted-foreground">({tasks.length})</span>
          </h1>
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={handleShowAddTaskModal}
          >
            <CheckSquare2Icon className="size-4 shrink-0" />
            Add task
          </Button>
        </div>
        <Heading>Open</Heading>
        {openTasks.length > 0 ? (
          <DocumentTaskList tasks={openTasks} />
        ) : (
          <EmptyText className="p-6">
            There is no open task for this document.
          </EmptyText>
        )}
        <Heading>Completed</Heading>
        {completedTasks.length > 0 ? (
          <DocumentTaskList tasks={completedTasks} />
        ) : (
          <EmptyText className="p-6">
            There is no completed task for this document.
          </EmptyText>
        )}
      </div>
    </ResponsiveScrollArea>
  );
}

function Heading(props: React.PropsWithChildren): React.JSX.Element {
  return (
    <h4 className="bg-neutral-50 px-6 py-3 text-sm font-medium text-muted-foreground dark:bg-neutral-900">
      {props.children}
    </h4>
  );
}
