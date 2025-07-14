'use client'

import type * as React from 'react'
import NiceModal from '@ebay/nice-modal-react'
import { Button } from '@nusoma/design-system/components/ui/button'
import { AddProjectModal } from './add-project-modal'

export function AddProjectButton(): React.JSX.Element {
  const handleShowAddProjectModal = (): void => {
    NiceModal.show(AddProjectModal)
  }
  return (
    <Button
      type='button'
      variant='default'
      size='default'
      className='whitespace-nowrap'
      onClick={handleShowAddProjectModal}
    >
      Add project
    </Button>
  )
}
