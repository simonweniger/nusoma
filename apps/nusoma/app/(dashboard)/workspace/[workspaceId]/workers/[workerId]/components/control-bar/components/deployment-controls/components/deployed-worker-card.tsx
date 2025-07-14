/** biome-ignore-all lint/nursery/useUniqueElementIds: ignored */
'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader } from '@nusoma/design-system/components/ui/card'
import { Label } from '@nusoma/design-system/components/ui/label'
import { Switch } from '@nusoma/design-system/components/ui/switch'
import { cn } from '@nusoma/design-system/lib/utils'
import { createLogger } from '@/lib/logger/console-logger'
import { WorkerPreview } from '@/app/(dashboard)/workspace/components/worker-preview'
import { useWorkerRegistry } from '@/stores/workers/registry/store'
import type { WorkerState } from '@/stores/workers/worker/types'

const _logger = createLogger('DeployedWorkerCard')

interface DeployedWorkerCardProps {
  currentWorkerState?: WorkerState
  deployedWorkerState: WorkerState
  className?: string
}

export function DeployedWorkerCard({
  currentWorkerState,
  deployedWorkerState,
  className,
}: DeployedWorkerCardProps) {
  const [showingDeployed, setShowingDeployed] = useState(true)
  const workerToShow = showingDeployed ? deployedWorkerState : currentWorkerState
  const activeWorkerId = useWorkerRegistry((state) => state.activeWorkerId)

  const previewKey = useMemo(() => {
    return `${showingDeployed ? 'deployed' : 'current'}-preview-${activeWorkerId}}`
  }, [showingDeployed, activeWorkerId])

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardHeader
        className={cn(
          'sticky top-0 z-10 space-y-4 p-4',
          'bg-background/70 dark:bg-background/50',
          'border-border/30 border-b dark:border-border/20',
          'shadow-sm'
        )}
      >
        <div className='flex items-center justify-between'>
          <h3 className='font-medium'>{showingDeployed ? 'Deployed Worker' : 'Current Worker'}</h3>
          {/* Controls */}
          <div className='flex items-center gap-2'>
            {/* Version toggle - only show if there's a current version */}
            {currentWorkerState && (
              <div className='flex items-center space-x-2'>
                <Label htmlFor='worker-version-toggle' className='text-muted-foreground text-sm'>
                  Current
                </Label>
                <Switch
                  id='worker-version-toggle'
                  checked={showingDeployed}
                  onCheckedChange={setShowingDeployed}
                />
                <Label htmlFor='worker-version-toggle' className='text-muted-foreground text-sm'>
                  Deployed
                </Label>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <div className='h-px w-full bg-border shadow-sm' />

      <CardContent className='p-0'>
        {/* Worker preview with fixed height */}
        <div className='h-[500px] w-full'>
          <WorkerPreview
            key={previewKey}
            workerState={workerToShow as WorkerState}
            showSubBlocks={true}
            height='100%'
            width='100%'
            isPannable={true}
            defaultPosition={{ x: 0, y: 0 }}
            defaultZoom={1}
          />
        </div>
      </CardContent>
    </Card>
  )
}
