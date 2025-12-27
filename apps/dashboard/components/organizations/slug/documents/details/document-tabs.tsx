import * as React from 'react';
import { ActivityIcon, CheckSquare2Icon, FileIcon } from 'lucide-react';

import { Separator } from '@workspace/ui/components/separator';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@workspace/ui/components/tabs';

import { DocumentEditorTab } from '~/components/organizations/slug/documents/details/editor/document-editor-tab';
import { DocumentNotesTab } from '~/components/organizations/slug/documents/details/notes/document-notes-tab';
import { DocumentTasksTab } from '~/components/organizations/slug/documents/details/tasks/document-tasks-tab';
import { DocumentActivityTab } from '~/components/organizations/slug/documents/details/timeline/document-activity-tab';
import type { DocumentDto } from '~/types/dtos/document-dto';

enum Tab {
  Editor = 'editor',
  Activity = 'activity',
  Notes = 'notes',
  Tasks = 'tasks'
}

const tabList = [
  {
    icon: FileIcon,
    label: 'Editor',
    value: Tab.Editor
  },
  {
    icon: ActivityIcon,
    label: 'Activity',
    value: Tab.Activity
  },
  {
    icon: FileIcon,
    label: 'Notes',
    value: Tab.Notes
  },
  {
    icon: CheckSquare2Icon,
    label: 'Tasks',
    value: Tab.Tasks
  }
];

export type DocumentTabsProps = {
  document: DocumentDto;
};

export async function DocumentTabs({
  document
}: DocumentTabsProps): Promise<React.JSX.Element> {
  return (
    <Tabs
      variant="underline"
      defaultValue={Tab.Activity}
      className="flex size-full flex-col"
    >
      <TabsList className="h-12 max-h-12 min-h-12 gap-x-2 overflow-x-auto border-none px-4">
        {tabList.map((item) => (
          <TabsTrigger
            key={item.value}
            value={item.value}
            className="mx-0 border-t-4 border-t-transparent"
          >
            <div className="flex flex-row items-center gap-2 rounded-md px-2 py-1 hover:bg-accent">
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </div>
          </TabsTrigger>
        ))}
      </TabsList>
      <Separator />
      <TabsContent
        value={Tab.Editor}
        className="m-0 p-0 md:grow md:overflow-hidden"
      >
        <React.Suspense>
          <DocumentEditorTab document={document} />
        </React.Suspense>
      </TabsContent>
      <TabsContent
        value={Tab.Activity}
        className="m-0 p-0 md:grow md:overflow-hidden"
      >
        <React.Suspense>
          <DocumentActivityTab document={document} />
        </React.Suspense>
      </TabsContent>
      <TabsContent
        value={Tab.Notes}
        className="m-0 p-0 md:grow md:overflow-hidden"
      >
        <React.Suspense>
          <DocumentNotesTab document={document} />
        </React.Suspense>
      </TabsContent>
      <TabsContent
        value={Tab.Tasks}
        className="m-0 p-0 md:grow md:overflow-hidden"
      >
        <React.Suspense>
          <DocumentTasksTab document={document} />
        </React.Suspense>
      </TabsContent>
    </Tabs>
  );
}
