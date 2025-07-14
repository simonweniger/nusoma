import type * as React from 'react'
import { EmptyState } from '@nusoma/design-system/components/ui/empty-state'
import { UsersIcon } from 'lucide-react'
import { AddProjectButton } from './add-project-button'

export function ProjectsEmptyState(): React.JSX.Element {
  return (
    <div className='p-6'>
      <EmptyState
        icon={
          <div className='flex size-12 items-center justify-center rounded-md border'>
            <UsersIcon className='size-6 shrink-0 text-muted-foreground' />
          </div>
        }
        title='No project yet'
        description='Add projects and they will show up here.'
      >
        <AddProjectButton />
      </EmptyState>
    </div>
  )
}
