'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@nusoma/design-system/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@nusoma/design-system/components/ui/tooltip'
import { Loader2, PlugIcon } from 'lucide-react'
import type { WorkspaceUserPermissions } from '@/hooks/use-user-permissions'
import { useWorkerRegistry } from '@/stores/workers/registry/store'
import type { WorkerState } from '@/stores/workers/worker/types'
import { DeployModal } from '../deploy-modal/deploy-modal'

interface DeploymentControlsProps {
  activeWorkerId: string | null
  needsRedeployment: boolean
  setNeedsRedeployment: (value: boolean) => void
  deployedState: WorkerState | null
  isLoadingDeployedState: boolean
  refetchDeployedState: () => Promise<void>
  userPermissions: WorkspaceUserPermissions
}

export function DeploymentControls({
  activeWorkerId,
  needsRedeployment,
  setNeedsRedeployment,
  deployedState,
  isLoadingDeployedState,
  refetchDeployedState,
  userPermissions,
}: DeploymentControlsProps) {
  const deploymentStatus = useWorkerRegistry((state) =>
    state.getWorkerDeploymentStatus(activeWorkerId)
  )
  const isDeployed = deploymentStatus?.isDeployed || false

  const workerNeedsRedeployment = needsRedeployment

  const [isDeploying, _setIsDeploying] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const lastWorkerIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (activeWorkerId !== lastWorkerIdRef.current) {
      lastWorkerIdRef.current = activeWorkerId
    }
  }, [activeWorkerId])

  const refetchWithErrorHandling = async () => {
    if (!activeWorkerId) return

    try {
      await refetchDeployedState()
    } catch (error) {}
  }

  const canDeploy = userPermissions.canAdmin
  const isDisabled = isDeploying || !canDeploy

  const handleDeployClick = useCallback(() => {
    if (canDeploy) {
      setIsModalOpen(true)
    }
  }, [canDeploy, setIsModalOpen])

  const getTooltipText = () => {
    if (!canDeploy) {
      return 'Admin permissions required to deploy workers as API'
    }
    if (isDeploying) {
      return 'Deploying...'
    }
    if (isDeployed && workerNeedsRedeployment) {
      return 'Worker changes detected'
    }
    if (isDeployed) {
      return 'Deployment Settings'
    }
    return 'Deploy as API'
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className='relative'>
            <Button variant='ghost' size='icon' onClick={handleDeployClick} disabled={isDisabled}>
              {isDeploying ? (
                <Loader2 className='h-5 w-5 animate-spin' />
              ) : (
                <PlugIcon className='h-5 w-5' />
              )}
              <span className='sr-only'>Deploy API</span>
            </Button>

            {isDeployed && workerNeedsRedeployment && (
              <div className='absolute top-0.5 right-0.5 flex items-center justify-center'>
                <div className='relative'>
                  <div className='absolute inset-0 h-2 w-2 animate-ping rounded-full bg-amber-500/50' />
                  <div className='zoom-in fade-in relative h-2 w-2 animate-in rounded-full bg-amber-500 ring-1 ring-background duration-300' />
                </div>
                <span className='sr-only'>Needs Redeployment</span>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>{getTooltipText()}</TooltipContent>
      </Tooltip>

      <DeployModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        workerId={activeWorkerId}
        needsRedeployment={workerNeedsRedeployment}
        setNeedsRedeployment={setNeedsRedeployment}
        deployedState={deployedState as WorkerState}
        isLoadingDeployedState={isLoadingDeployedState}
        refetchDeployedState={refetchWithErrorHandling}
      />
    </>
  )
}
