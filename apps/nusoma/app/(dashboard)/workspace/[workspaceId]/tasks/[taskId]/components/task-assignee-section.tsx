'use client'

import type * as React from 'react'
import type { TaskDto } from '@nusoma/types/dtos/task-dto'
import { UserIcon } from 'lucide-react'
import { AssignWorker } from '../../components/assign-worker'

export type TaskAssigneeSectionProps = React.HtmlHTMLAttributes<HTMLDivElement> & {
  task: TaskDto
}

export function TaskAssigneeSection({
  task,
  ...others
}: TaskAssigneeSectionProps): React.JSX.Element {
  return (
    <section {...others}>
      <div className='space-y-4 p-6'>
        <div className='flex flex-col items-start whitespace-nowrap'>
          <dt className='flex h-7 min-w-24 flex-row items-center gap-2 text-muted-foreground text-sm'>
            <UserIcon className='size-3 shrink-0' />
            Assignee
          </dt>
          <div className='-ml-2 flex w-full items-center gap-2 rounded-xl p-2 hover:bg-muted'>
            <AssignWorker
              taskId={task.id}
              workspaceId={task.workspaceId!}
              projectId={task.projectId || undefined}
              assigneeId={task.assigneeId}
              showWorkerName={true}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
