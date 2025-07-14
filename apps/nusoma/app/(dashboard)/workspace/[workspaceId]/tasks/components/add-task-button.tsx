'use client'

import type * as React from 'react'
import NiceModal from '@ebay/nice-modal-react'
import { Button } from '@nusoma/design-system/components/ui/button'
import { AddTaskModal } from './add-task-modal'

interface AddTaskButtonProps {
  workspaceId?: string
  projectId?: string
}

export function AddTaskButton({ workspaceId, projectId }: AddTaskButtonProps): React.JSX.Element {
  const handleShowAddTaskModal = (): void => {
    NiceModal.show(AddTaskModal, { workspaceId, projectId })
  }
  return (
    <Button
      type='button'
      variant='default'
      size='xxs'
      className='whitespace-nowrap'
      onClick={handleShowAddTaskModal}
    >
      Add task
    </Button>
  )
}
