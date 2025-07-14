'use client'

import { useMemo } from 'react'
import { ScrollArea, ScrollBar } from '@nusoma/design-system/components/ui/scroll-area'
import { useWorkerRegistry } from '@/stores/workers/registry/store'
import type { WorkerMetadata } from '@/stores/workers/registry/types'
import WorkerLine from './workers-line'

export default function Workers() {
  // Get state from Zustand store
  const { workers, activeWorkspaceId, removeWorker, duplicateWorker, getWorkerDeploymentStatus } =
    useWorkerRegistry()

  const filteredWorkers = useMemo(() => {
    const filtered: WorkerMetadata[] = []

    // Only process workers when not in loading state
    if (workers) {
      for (const worker of Object.values(workers)) {
        // Include workers that either:
        // 1. Belong to the active workspace, OR
        // 2. Don't have a workspace ID (legacy workers)
        if (worker.workspaceId === activeWorkspaceId || !worker.workspaceId) {
          filtered.push(worker)
        }
      }

      // Sort workers by last modified date (newest first)
      filtered.sort((a, b) => {
        const dateA =
          a.lastModified instanceof Date
            ? a.lastModified.getTime()
            : new Date(a.lastModified).getTime()
        const dateB =
          b.lastModified instanceof Date
            ? b.lastModified.getTime()
            : new Date(b.lastModified).getTime()
        return dateB - dateA
      })
    }

    return filtered
  }, [workers, activeWorkspaceId])

  return (
    <div className='w-full'>
      <div className='sticky top-0 z-10 flex items-center border-b bg-container px-6 py-3 text-muted-foreground text-sm'>
        <div className='w-[50%] sm:w-[40%] md:w-[35%] lg:w-[30%]'>Worker</div>
        <div className='hidden sm:block sm:w-[15%] md:w-[15%]'>Status</div>
        <div className='w-[30%] sm:w-[25%] md:w-[20%]'>Blocks</div>
        <div className='hidden sm:block sm:w-[10%] md:w-[10%]'>Count</div>
        <div className='w-[40%] text-right sm:w-[25%] md:w-[18%]'>Actions</div>
      </div>

      {!workers ? (
        <div className='py-8 text-center text-muted-foreground'>Loading workers...</div>
      ) : filteredWorkers.length === 0 ? (
        <div className='py-8 text-center text-muted-foreground'>
          No workers found. Create your first worker to get started.
        </div>
      ) : (
        <div className='w-full'>
          <ScrollArea className='h-[calc(100vh-10rem)]'>
            {filteredWorkers.map((worker) => (
              <WorkerLine
                key={worker.id}
                worker={worker}
                duplicateWorker={duplicateWorker}
                getWorkerDeploymentStatus={getWorkerDeploymentStatus}
                removeWorker={removeWorker}
              />
            ))}
            <ScrollBar orientation='horizontal' />
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
