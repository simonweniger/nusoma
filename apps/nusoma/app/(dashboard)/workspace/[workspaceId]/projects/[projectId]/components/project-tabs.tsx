import * as React from 'react'
import { Separator } from '@nusoma/design-system/components/ui/separator'
import {
  UnderlinedTabs,
  UnderlinedTabsContent,
  UnderlinedTabsList,
  UnderlinedTabsTrigger,
} from '@nusoma/design-system/components/ui/underlined-tabs'
import type { ProjectDto } from '@nusoma/types/dtos/project-dto'
import { CheckSquare2Icon, FileIcon } from 'lucide-react'
import { ProjectNotesTab } from './notes/project-notes-tab'
import { ProjectTasksTab } from './tasks/project-tasks-tab'

enum Tab {
  Tasks = 'tasks',
  Notes = 'notes',
}

const tabList = [
  {
    icon: CheckSquare2Icon,
    label: 'Tasks',
    value: Tab.Tasks,
  },
  {
    icon: FileIcon,
    label: 'Notes',
    value: Tab.Notes,
  },
]

export type ProjectTabsProps = {
  project: ProjectDto
}

export async function ProjectTabs({ project }: ProjectTabsProps): Promise<React.JSX.Element> {
  return (
    <UnderlinedTabs defaultValue={Tab.Tasks} className='flex size-full flex-col'>
      <UnderlinedTabsList className='h-12 max-h-12 min-h-12 gap-x-2 overflow-x-auto border-none px-4'>
        {tabList.map((item) => (
          <UnderlinedTabsTrigger
            key={item.value}
            value={item.value}
            className='mx-0 border-t-4 border-t-transparent'
          >
            <div className='flex flex-row items-center gap-2 rounded-md px-2 py-1 hover:bg-accent'>
              <item.icon className='size-4 shrink-0' />
              {item.label}
            </div>
          </UnderlinedTabsTrigger>
        ))}
      </UnderlinedTabsList>
      <Separator />
      <UnderlinedTabsContent value={Tab.Notes} className='m-0 p-0 md:grow md:overflow-hidden'>
        <React.Suspense>
          <ProjectNotesTab project={project} />
        </React.Suspense>
      </UnderlinedTabsContent>
      <UnderlinedTabsContent value={Tab.Tasks} className='m-0 p-0 md:grow md:overflow-hidden'>
        <React.Suspense>
          <ProjectTasksTab project={project} />
        </React.Suspense>
      </UnderlinedTabsContent>
    </UnderlinedTabs>
  )
}
