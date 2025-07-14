'use client'

import { Button } from '@nusoma/design-system/components/ui/button'
import { SidebarTrigger } from '@nusoma/design-system/components/ui/sidebar'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCreateWorker } from '@/stores/workers/mutations'
import { useWorkerRegistry } from '@/stores/workers/registry/store'

export default function HeaderNav() {
  const { workers, activeWorkspaceId } = useWorkerRegistry()

  const router = useRouter()
  const createWorkerMutation = useCreateWorker()

  const handleCreateWorker = async () => {
    try {
      // Prevent multiple simultaneous worker creation attempts
      if (createWorkerMutation.isPending) {
        return
      }

      // Ensure we have a workspaceId before creating.
      // This can be null if the user has no workspaces or is in a personal space context.
      if (!activeWorkspaceId) {
        // TODO: Handle creation in a "personal" workspace context or show an error
        console.error('No active workspace selected. Cannot create worker.')
        return
      }

      // Create the worker using the mutation
      const result = await createWorkerMutation.mutateAsync({
        workspaceId: activeWorkspaceId,
      })

      // Navigate to the new worker
      if (result?.id) {
        router.push(`/workspace/${activeWorkspaceId}/workers/${result.id}`)
      }
    } catch (_error) {}
  }
  return (
    <div className='flex h-10 w-full items-center justify-between border-b px-6 py-1.5'>
      <div className='flex items-center gap-2'>
        <SidebarTrigger className='' />
        <div className='flex items-center gap-1'>
          <span className='font-medium text-sm'>Workers</span>
          <span className='rounded-md bg-accent px-1.5 py-1 text-xs'>
            {Object.values(workers).length}
          </span>
        </div>
      </div>
      <div className='flex items-center gap-2'>
        <Button
          className='relative'
          size='xs'
          onClick={() => handleCreateWorker()}
          disabled={createWorkerMutation.isPending}
        >
          <Plus className='size-4' />
          {createWorkerMutation.isPending ? 'Creating...' : 'New worker'}
        </Button>
      </div>
    </div>
  )
}
