'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@nusoma/design-system/components/ui/alert-dialog'
import { Button } from '@nusoma/design-system/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@nusoma/design-system/components/ui/dialog'
import { useWorkerRegistry } from '@/stores/workers/registry/store'
import { mergeSubblockState } from '@/stores/workers/utils'
import { useWorkerStore } from '@/stores/workers/worker/store'
import type { WorkerState } from '@/stores/workers/worker/types'
import { DeployedWorkerCard } from './deployed-worker-card'

interface DeployedWorkerModalProps {
  isOpen: boolean
  onClose: () => void
  needsRedeployment: boolean
  deployedWorkerState: WorkerState
}

export function DeployedWorkerModal({
  isOpen,
  onClose,
  needsRedeployment,
  deployedWorkerState,
}: DeployedWorkerModalProps) {
  const [showRevertDialog, setShowRevertDialog] = useState(false)
  const { revertToDeployedState } = useWorkerStore()
  const activeWorkerId = useWorkerRegistry((state) => state.activeWorkerId)

  // Get current worker state to compare with deployed state
  const currentWorkerState = useWorkerStore((state) => ({
    blocks: activeWorkerId ? mergeSubblockState(state.blocks, activeWorkerId) : state.blocks,
    edges: state.edges,
    loops: state.loops,
    parallels: state.parallels,
    cursors: state.cursors,
  }))

  const handleRevert = () => {
    if (activeWorkerId) {
      revertToDeployedState(deployedWorkerState)
      setShowRevertDialog(false)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className='max-h-[100vh] overflow-y-auto sm:max-w-[1100px]'
        style={{ zIndex: 1000 }}
      >
        <div className='sr-only'>
          <DialogHeader>
            <DialogTitle>Deployed Worker</DialogTitle>
          </DialogHeader>
        </div>
        <DeployedWorkerCard
          currentWorkerState={currentWorkerState}
          deployedWorkerState={deployedWorkerState}
        />

        <div className='mt-6 flex justify-between'>
          {needsRedeployment && (
            <AlertDialog open={showRevertDialog} onOpenChange={setShowRevertDialog}>
              <AlertDialogTrigger asChild>
                <Button variant='destructive'>Revert to Deployed</Button>
              </AlertDialogTrigger>
              <AlertDialogContent style={{ zIndex: 1001 }} className='sm:max-w-[425px]'>
                <AlertDialogHeader>
                  <AlertDialogTitle>Revert to Deployed Version?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will replace your current worker with the deployed version. Any unsaved
                    changes will be lost. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleRevert}
                    className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  >
                    Revert
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <Button variant='outline' onClick={onClose} className='ml-auto'>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
