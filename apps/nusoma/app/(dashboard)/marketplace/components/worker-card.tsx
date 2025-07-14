'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader } from '@nusoma/design-system/components/ui/card'
import { Eye } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useWorkerRegistry } from '@/stores/workers/registry/store'
import { WorkerPreview } from '../../workspace/components/worker-preview'
import type { Worker } from '../marketplace'

/**
 * WorkerCardProps interface - defines the properties for the WorkerCard component
 * @property {Worker} worker - The worker data to display
 * @property {number} index - The index of the worker in the list
 * @property {Function} onHover - Optional callback function triggered when card is hovered
 */
interface WorkerCardProps {
  worker: Worker
  index: number
  onHover?: (id: string) => void
}

/**
 * WorkerCard component - Displays a worker in a card format
 * Shows either a worker preview, thumbnail image, or fallback text
 * State is now pre-loaded in most cases, fallback to load on hover if needed
 */
export function WorkerCard({ worker, onHover }: WorkerCardProps) {
  const [isPreviewReady, setIsPreviewReady] = useState(!!worker.workerState)
  const router = useRouter()
  const { createWorker } = useWorkerRegistry()

  // When worker state becomes available, update preview ready state
  useEffect(() => {
    if (worker.workerState && !isPreviewReady) {
      setIsPreviewReady(true)
    }
  }, [worker.workerState, isPreviewReady])

  /**
   * Handle mouse enter event
   * Sets hover state and triggers onHover callback to load worker state if needed
   */
  const handleMouseEnter = () => {
    if (onHover && !worker.workerState) {
      onHover(worker.id)
    }
  }

  /**
   * Handle worker card click - track views and import worker
   */
  const handleClick = async () => {
    try {
      // Track view
      await fetch('/api/marketplace/workers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: worker.id }),
      })

      // Create a local copy of the marketplace worker
      if (worker.workerState) {
        const newWorkerId = createWorker({
          name: `${worker.name} (Copy)`,
          description: worker.description,
          marketplaceId: worker.id,
          marketplaceState: worker.workerState,
        })

        // Navigate to the new worker
        router.push(`/workspace/${newWorkerId}`)
      } else {
      }
    } catch (_error) {}
  }

  return (
    <div
      key={worker.id}
      aria-label={`View ${worker.name} worker`}
      className='block cursor-pointer'
      onClick={handleClick}
      role='button'
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick()
        }
      }}
    >
      <Card
        className='flex h-full flex-col overflow-hidden transition-all hover:shadow-md'
        onMouseEnter={handleMouseEnter}
      >
        {/* Worker preview/thumbnail area */}
        <div className='relative h-40 overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900'>
          {isPreviewReady && worker.workerState ? (
            // Interactive Preview
            <div className='absolute inset-0 flex items-center justify-center'>
              <div className='h-full w-full scale-[0.9] transform-gpu'>
                <WorkerPreview
                  workerState={{
                    ...worker.workerState,
                    parallels: worker.workerState.parallels || {},
                    loops: worker.workerState.loops || {},
                    cursors: worker.workerState.cursors || {},
                  }}
                />
              </div>
            </div>
          ) : worker.thumbnail ? (
            // Show static thumbnail image if available
            <div
              className='h-full w-full bg-center bg-cover'
              style={{
                backgroundImage: `url(${worker.thumbnail})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center top',
              }}
            />
          ) : (
            // Fallback to text if no preview or thumbnail is available
            <div className='flex h-full w-full items-center justify-center'>
              <span className='font-medium text-lg text-muted-foreground'>{worker.name}</span>
            </div>
          )}
        </div>
        <div className='flex flex-grow flex-col'>
          {/* Worker title */}
          <CardHeader className='p-4 pb-2'>
            <h3 className='font-medium text-sm'>{worker.name}</h3>
          </CardHeader>
          {/* Worker description */}
          <CardContent className='flex flex-grow flex-col p-4 pt-0 pb-2'>
            <p className='line-clamp-2 text-muted-foreground text-xs'>{worker.description}</p>
          </CardContent>
          {/* Footer with author and stats */}
          <CardFooter className='mt-auto flex items-center justify-between p-4 pt-2'>
            <div className='text-muted-foreground text-xs'>by {worker.author}</div>
            <div className='flex items-center'>
              <div className='flex items-center space-x-1'>
                <Eye className='h-3.5 w-3.5 text-muted-foreground' />
                <span className='font-medium text-muted-foreground text-xs'>{worker.views}</span>
              </div>
            </div>
          </CardFooter>
        </div>
      </Card>
    </div>
  )
}
