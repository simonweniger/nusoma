'use client'

import { useEffect, useState } from 'react'
import type { Workspace } from '@nusoma/database/schema'
import { Button } from '@nusoma/design-system/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@nusoma/design-system/components/ui/dialog'
import { Input } from '@nusoma/design-system/components/ui/input'

// New WorkspaceModal component
interface WorkspaceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateWorkspace: (name: string) => void
}

export function WorkspaceModal({ open, onOpenChange, onCreateWorkspace }: WorkspaceModalProps) {
  const [workspaceName, setWorkspaceName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (workspaceName.trim()) {
      onCreateWorkspace(workspaceName.trim())
      setWorkspaceName('')
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex flex-col gap-0 overflow-hidden p-0 sm:max-w-[500px]'>
        <DialogHeader className='flex-shrink-0 border-b px-6 py-4'>
          <DialogTitle className='font-medium text-lg'>Create New Workspace</DialogTitle>
        </DialogHeader>

        <div className='px-6 pt-4 pb-6'>
          <form onSubmit={handleSubmit}>
            <div className='space-y-4'>
              <div className='space-y-2'>
                <label htmlFor='workspace-name' className='font-medium text-sm'>
                  Workspace Name
                </label>
                <Input
                  id='workspace-name'
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder='Enter workspace name'
                  className='w-full'
                  autoFocus
                />
              </div>
              <div className='flex justify-end'>
                <Button type='submit' size='sm' disabled={!workspaceName.trim()}>
                  Create
                </Button>
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Edit Workspace Modal
interface WorkspaceEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateWorkspace: (id: string, name: string) => void
  workspace: Workspace | null
}

export function WorkspaceEditModal({
  open,
  onOpenChange,
  onUpdateWorkspace,
  workspace,
}: WorkspaceEditModalProps) {
  const [workspaceName, setWorkspaceName] = useState('')

  useEffect(() => {
    if (workspace && open) {
      setWorkspaceName(workspace.name)
    }
  }, [workspace, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (workspace && workspaceName.trim()) {
      onUpdateWorkspace(workspace.id, workspaceName.trim())
      setWorkspaceName('')
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex flex-col gap-0 overflow-hidden p-0 sm:max-w-[500px]'>
        <DialogHeader className='flex-shrink-0 border-b px-6 py-4'>
          <DialogTitle className='font-medium text-lg'>Edit Workspace</DialogTitle>
        </DialogHeader>

        <div className='px-6 pt-4 pb-6'>
          <form onSubmit={handleSubmit}>
            <div className='space-y-4'>
              <div className='space-y-2'>
                <label htmlFor='workspace-name-edit' className='font-medium text-sm'>
                  Workspace Name
                </label>
                <Input
                  id='workspace-name-edit'
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder='Enter workspace name'
                  className='w-full'
                  autoFocus
                />
              </div>
              <div className='flex justify-end'>
                <Button type='submit' size='sm' disabled={!workspaceName.trim()}>
                  Update
                </Button>
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
