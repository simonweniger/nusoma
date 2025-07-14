'use client'

import { useEffect, useState } from 'react'
import { Button } from '@nusoma/design-system/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@nusoma/design-system/components/ui/dialog'
import { cn } from '@nusoma/design-system/lib/utils'
import { Loader2 } from 'lucide-react'
import { env } from '@/lib/env'
import { createLogger } from '@/lib/logger/console-logger'
import { DeployForm } from '@/app/(dashboard)/workspace/[workspaceId]/workers/[workerId]/components/control-bar/components/deploy-modal/components/deploy-form/deploy-form'
import { DeploymentInfo } from '@/app/(dashboard)/workspace/[workspaceId]/workers/[workerId]/components/control-bar/components/deploy-modal/components/deployment-info/deployment-info'
import { useNotificationStore } from '@/stores/notifications/store'
import { useWorkerRegistry } from '@/stores/workers/registry/store'
import { useSubBlockStore } from '@/stores/workers/subblock/store'
import { useWorkerStore } from '@/stores/workers/worker/store'
import type { WorkerState } from '@/stores/workers/worker/types'

const logger = createLogger('DeployModal')

interface DeployModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workerId: string | null
  needsRedeployment: boolean
  setNeedsRedeployment: (value: boolean) => void
  deployedState: WorkerState
  isLoadingDeployedState: boolean
  refetchDeployedState: () => Promise<void>
}

interface ApiKey {
  id: string
  name: string
  key: string
  lastUsed?: string
  createdAt: string
  expiresAt?: string
}

interface WorkerDeploymentInfo {
  isDeployed: boolean
  deployedAt?: string
  apiKey: string
  endpoint: string
  exampleCommand: string
  needsRedeployment: boolean
}

interface DeployFormValues {
  apiKey: string
  newKeyName?: string
}

export function DeployModal({
  open,
  onOpenChange,
  workerId,
  needsRedeployment,
  setNeedsRedeployment,
  deployedState,
  isLoadingDeployedState,
  refetchDeployedState,
}: DeployModalProps) {
  // Store hooks
  const { addNotification } = useNotificationStore()

  // Use registry store for deployment-related functions
  const deploymentStatus = useWorkerRegistry((state) => state.getWorkerDeploymentStatus(workerId))
  const isDeployed = deploymentStatus?.isDeployed || false
  const setDeploymentStatus = useWorkerRegistry((state) => state.setDeploymentStatus)

  // Local state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUndeploying, setIsUndeploying] = useState(false)
  const [deploymentInfo, setDeploymentInfo] = useState<WorkerDeploymentInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [keysLoaded, setKeysLoaded] = useState(false)
  const [apiDeployError, setApiDeployError] = useState<string | null>(null)

  // Generate an example input format for the API request
  const getInputFormatExample = () => {
    let inputFormatExample = ''
    try {
      const blocks = Object.values(useWorkerStore.getState().blocks)
      const starterBlock = blocks.find((block) => block.type === 'starter')

      if (starterBlock) {
        const inputFormat = useSubBlockStore.getState().getValue(starterBlock.id, 'inputFormat')

        if (inputFormat && Array.isArray(inputFormat) && inputFormat.length > 0) {
          const exampleData: Record<string, any> = {}
          inputFormat.forEach((field: any) => {
            if (field.name) {
              switch (field.type) {
                case 'string':
                  exampleData[field.name] = 'example'
                  break
                case 'number':
                  exampleData[field.name] = 42
                  break
                case 'boolean':
                  exampleData[field.name] = true
                  break
                case 'object':
                  exampleData[field.name] = { key: 'value' }
                  break
                case 'array':
                  exampleData[field.name] = [1, 2, 3]
                  break
              }
            }
          })

          inputFormatExample = ` -d '${JSON.stringify(exampleData)}'`
        }
      }
    } catch (error) {
      logger.error('Error generating input format example:', error)
    }

    return inputFormatExample
  }

  // Fetch API keys when modal opens
  const fetchApiKeys = async () => {
    if (!open) {
      return
    }

    try {
      setKeysLoaded(false)
      const response = await fetch('/api/user/api-keys')

      if (response.ok) {
        const data = await response.json()
        setApiKeys(data.keys || [])
        setKeysLoaded(true)
      }
    } catch (error) {
      logger.error('Error fetching API keys:', { error })
      addNotification('error', 'Failed to fetch API keys', workerId)
      setKeysLoaded(true)
    }
  }

  // Call fetchApiKeys when the modal opens
  useEffect(() => {
    if (open) {
      setIsLoading(true)
      fetchApiKeys()
    }
  }, [open, workerId])

  // Fetch deployment info when the modal opens and the worker is deployed
  useEffect(() => {
    async function fetchDeploymentInfo() {
      if (!open || !workerId || !isDeployed) {
        setDeploymentInfo(null)
        // Only reset loading if modal is closed
        if (!open) {
          setIsLoading(false)
        }
        return
      }

      try {
        setIsLoading(true)

        // Get deployment info
        const response = await fetch(`/api/workers/${workerId}/deploy`)

        if (!response.ok) {
          throw new Error('Failed to fetch deployment information')
        }

        const data = await response.json()
        const endpoint = `${env.NEXT_PUBLIC_APP_URL}/api/workers/${workerId}/execute`
        const inputFormatExample = getInputFormatExample()

        setDeploymentInfo({
          isDeployed: data.isDeployed,
          deployedAt: data.deployedAt,
          apiKey: data.apiKey,
          endpoint,
          exampleCommand: `curl -X POST -H "X-API-Key: ${data.apiKey}" -H "Content-Type: application/json"${inputFormatExample} ${endpoint}`,
          needsRedeployment,
        })
      } catch (error) {
        logger.error('Error fetching deployment info:', { error })
        addNotification('error', 'Failed to fetch deployment information', workerId)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDeploymentInfo()
  }, [open, workerId, isDeployed, addNotification, needsRedeployment])

  // Handle form submission for deployment
  const onDeploy = async (data: DeployFormValues) => {
    if (!workerId) {
      addNotification('error', 'No active worker to deploy', null)
      return
    }

    // Reset any previous errors
    setApiDeployError(null)

    try {
      setIsSubmitting(true)

      // Deploy the worker with the selected API key
      const response = await fetch(`/api/workers/${workerId}/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: data.apiKey,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to deploy worker')
      }

      const { isDeployed: newDeployStatus, deployedAt } = await response.json()

      // Update the store with the deployment status
      setDeploymentStatus(
        workerId,
        newDeployStatus,
        deployedAt ? new Date(deployedAt) : undefined,
        data.apiKey
      )

      // Reset the needs redeployment flag
      setNeedsRedeployment(false)
      if (workerId) {
        useWorkerRegistry.getState().setWorkerNeedsRedeployment(workerId, false)
      }

      // Update the local deployment info
      const endpoint = `${env.NEXT_PUBLIC_APP_URL}/api/workers/${workerId}/execute`
      const inputFormatExample = getInputFormatExample()

      const newDeploymentInfo = {
        isDeployed: true,
        deployedAt: deployedAt,
        apiKey: data.apiKey,
        endpoint,
        exampleCommand: `curl -X POST -H "X-API-Key: ${data.apiKey}" -H "Content-Type: application/json"${inputFormatExample} ${endpoint}`,
        needsRedeployment: false,
      }

      setDeploymentInfo(newDeploymentInfo)

      // Fetch the updated deployed state after deployment
      await refetchDeployedState()

      // No notification on successful deploy
    } catch (error: any) {
      logger.error('Error deploying worker:', { error })
      addNotification('error', `Failed to deploy worker: ${error.message}`, workerId)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle worker undeployment
  const handleUndeploy = async () => {
    if (!workerId) {
      addNotification('error', 'No active worker to undeploy', null)
      return
    }

    try {
      setIsUndeploying(true)

      const response = await fetch(`/api/workers/${workerId}/deploy`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to undeploy worker')
      }

      // Update deployment status in the store
      setDeploymentStatus(workerId, false)

      // Add a success notification
      addNotification('info', 'Worker successfully undeployed', workerId)

      // Close the modal
      onOpenChange(false)
    } catch (error: any) {
      logger.error('Error undeploying worker:', { error })
      addNotification('error', `Failed to undeploy worker: ${error.message}`, workerId)
    } finally {
      setIsUndeploying(false)
    }
  }

  // Handle redeployment of worker
  const handleRedeploy = async () => {
    if (!workerId) {
      addNotification('error', 'No active worker to redeploy', null)
      return
    }

    try {
      setIsSubmitting(true)

      const response = await fetch(`/api/workers/${workerId}/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to redeploy worker')
      }

      const { isDeployed: newDeployStatus, deployedAt, apiKey } = await response.json()

      // Update deployment status in the store
      setDeploymentStatus(
        workerId,
        newDeployStatus,
        deployedAt ? new Date(deployedAt) : undefined,
        apiKey
      )

      // Reset the needs redeployment flag
      setNeedsRedeployment(false)
      if (workerId) {
        useWorkerRegistry.getState().setWorkerNeedsRedeployment(workerId, false)
      }

      // Fetch the updated deployed state after redeployment
      await refetchDeployedState()

      addNotification('info', 'Worker successfully redeployed', workerId)
    } catch (error: any) {
      logger.error('Error redeploying worker:', { error })
      addNotification('error', `Failed to redeploy worker: ${error.message}`, workerId)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Custom close handler to ensure we clean up loading states
  const handleCloseModal = () => {
    setIsSubmitting(false)
    onOpenChange(false)
  }

  // Add a new handler for chat undeploy
  const _handleChatUndeploy = async () => {
    if (!workerId) {
      addNotification('error', 'No active worker to undeploy chat', null)
      return
    }

    try {
      setIsUndeploying(true)

      // First get the chat deployment info
      const response = await fetch(`/api/workers/${workerId}/chat/status`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get chat info')
      }

      const data = await response.json()

      if (!data.isDeployed || !data.deployment || !data.deployment.id) {
        throw new Error('No active chat deployment found')
      }

      // Delete the chat
      const deleteResponse = await fetch(`/api/chat/edit/${data.deployment.id}`, {
        method: 'DELETE',
      })

      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json()
        throw new Error(errorData.error || 'Failed to undeploy chat')
      }
      // Add a success notification
      addNotification('info', 'Chat successfully undeployed', workerId)

      // Close the modal
      onOpenChange(false)
    } catch (error: any) {
      logger.error('Error undeploying chat:', { error })
      addNotification('error', `Failed to undeploy chat: ${error.message}`, workerId)
    } finally {
      setIsUndeploying(false)
    }
  }

  // Find or create appropriate method to handle chat deployment
  const _handleChatSubmit = async () => {
    if (!workerId) {
      addNotification('error', 'No active worker to deploy', null)
      return
    }

    // Check if worker is deployed
    if (!isDeployed) {
      // Deploy worker first
      try {
        // Call the API to deploy the worker
        const response = await fetch(`/api/workers/${workerId}/deploy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deployApiEnabled: true,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to deploy worker')
        }

        const { isDeployed: newDeployStatus, deployedAt, apiKey } = await response.json()

        // Update the store with the deployment status
        setDeploymentStatus(
          workerId,
          newDeployStatus,
          deployedAt ? new Date(deployedAt) : undefined,
          apiKey
        )
      } catch (error: any) {
        logger.error('Error auto-deploying worker for chat:', { error })
        addNotification('error', `Failed to deploy worker: ${error.message}`, workerId)
        return
      }
    }

    // Now submit the chat deploy form
    const form = document.querySelector('.chat-deploy-form') as HTMLFormElement
    if (form) {
      form.requestSubmit()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleCloseModal}>
      <DialogContent className='flex max-h-[78vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[600px]'>
        <DialogHeader className='flex-shrink-0 border-b px-6 py-4'>
          <DialogTitle className='font-medium text-lg'>Deploy Worker</DialogTitle>
        </DialogHeader>

        <div className='flex flex-1 flex-col overflow-hidden'>
          <div className='flex-1 overflow-y-auto'>
            <div className='p-6'>
              {isDeployed ? (
                <DeploymentInfo
                  isLoading={isLoading}
                  deploymentInfo={deploymentInfo}
                  onRedeploy={handleRedeploy}
                  onUndeploy={handleUndeploy}
                  isSubmitting={isSubmitting}
                  isUndeploying={isUndeploying}
                  workerId={workerId}
                  deployedState={deployedState}
                  isLoadingDeployedState={isLoadingDeployedState}
                />
              ) : (
                <>
                  {apiDeployError && (
                    <div className='mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm'>
                      <div className='font-semibold'>API Deployment Error</div>
                      <div>{apiDeployError}</div>
                    </div>
                  )}
                  <div className='-mx-1 px-1'>
                    <DeployForm
                      apiKeys={apiKeys}
                      keysLoaded={keysLoaded}
                      endpointUrl={`${env.NEXT_PUBLIC_APP_URL}/api/workers/${workerId}/execute`}
                      workerId={workerId || ''}
                      onSubmit={onDeploy}
                      getInputFormatExample={getInputFormatExample}
                      onApiKeyCreated={fetchApiKeys}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        {!isDeployed && (
          <div className='flex flex-shrink-0 justify-between border-t px-6 py-4'>
            <Button variant='outline' onClick={handleCloseModal}>
              Cancel
            </Button>

            <Button
              type='button'
              onClick={() => onDeploy({ apiKey: apiKeys.length > 0 ? apiKeys[0].key : '' })}
              disabled={isSubmitting || (!keysLoaded && !apiKeys.length)}
              className={cn(
                'gap-2 font-medium',
                'bg-[#802FFF] hover:bg-[#7028E6]',
                'shadow-[0_0_0_0_#802FFF] hover:shadow-[0_0_0_4px_rgba(127,47,255,0.15)]',
                'text-white transition-all duration-200',
                'disabled:opacity-50 disabled:hover:bg-[#802FFF] disabled:hover:shadow-none'
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                  Deploying...
                </>
              ) : (
                'Deploy API'
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
