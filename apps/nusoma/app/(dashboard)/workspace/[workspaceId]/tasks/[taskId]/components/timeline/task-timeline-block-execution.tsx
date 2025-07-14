'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@nusoma/design-system/components/ui/avatar'
import { Badge } from '@nusoma/design-system/components/ui/badge'
import { Button } from '@nusoma/design-system/components/ui/button'
import { Card, CardContent, CardHeader } from '@nusoma/design-system/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@nusoma/design-system/components/ui/collapsible'
import type { BlockExecutionTimelineEventDto } from '@nusoma/types/dtos/timeline-event-dto'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  PlayIcon,
  XCircleIcon,
  XIcon,
} from 'lucide-react'
import { useParams } from 'next/navigation'
import { getBlock } from '@/blocks'
import { BlockOutputRenderer } from './block-output-renderer'

type TaskBlockOutput = {
  id: string
  blockId: string
  blockName: string | null
  blockType: string
  executionId: string
  output: any
  input: any | null
  success: boolean
  error: string | null
  durationMs: number
  startedAt: Date
  endedAt: Date
}

type TaskTimelineBlockExecutionProps = {
  event: BlockExecutionTimelineEventDto
}

export function TaskTimelineBlockExecution({ event }: TaskTimelineBlockExecutionProps) {
  const params = useParams()
  const taskId = params.taskId as string
  const [isExpanded, setIsExpanded] = useState(true)

  const {
    data: blockOutputs = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ['task-block-outputs', taskId, event.id],
    queryFn: async (): Promise<TaskBlockOutput[]> => {
      const response = await fetch(`/api/tasks/${taskId}/activities/${event.id}/block-outputs`)

      if (!response.ok) {
        throw new Error('Failed to fetch block outputs')
      }

      const data = await response.json()
      return data.blockOutputs || []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
  }

  const getBlockConfig = (blockType: string) => {
    return getBlock(blockType)
  }

  const renderBlockIcon = (blockType: string) => {
    const config = getBlockConfig(blockType)

    if (config) {
      const IconComponent = config.icon
      return (
        <div
          className='flex h-7 w-7 flex-shrink-0 items-center justify-center rounded'
          style={{ backgroundColor: config.bgColor }}
        >
          <IconComponent className='h-4 w-4 text-white' />
        </div>
      )
    }

    // Fallback to simple colored box with first letter if config not found
    return (
      <div className='flex h-7 w-7 flex-shrink-0 items-center justify-center rounded bg-gray-500'>
        <span className='font-medium text-white text-xs'>{blockType.charAt(0).toUpperCase()}</span>
      </div>
    )
  }

  const hasFailures = event.failedBlocks > 0

  return (
    <div className='flex w-full items-start space-x-4'>
      <Avatar title={event.actor.name} className='relative ml-0.5 size-6 flex-none rounded-full'>
        <AvatarImage src={event.actor.image} alt='avatar' />
        <AvatarFallback
          className={`size-6 border text-[10px] shadow-elevation-medium ${
            hasFailures
              ? 'border-red-400 bg-gradient-to-br from-red-600 to-red-200 dark:from-red-800 dark:to-red-400'
              : 'border-green-400 bg-gradient-to-br from-green-600 to-green-200 dark:from-green-800 dark:to-green-400'
          }`}
        >
          {hasFailures ? (
            <XIcon
              fill='white'
              className='size-3 rounded-lg text-white opacity-80 shadow backdrop-blur-md dark:opacity-60'
            />
          ) : (
            <PlayIcon
              fill='white'
              className='size-2.5 rounded-lg text-white opacity-80 shadow backdrop-blur-md dark:opacity-60'
            />
          )}
        </AvatarFallback>
      </Avatar>

      {/* Header */}
      <div className='flex w-full flex-col space-y-2'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-x-2'>
            <p className='font-medium text-sm'>Execution completed</p>
            <Badge variant='outline' className='text-xs'>
              {event.successfulBlocks}/{event.totalBlocks} blocks
            </Badge>
            {event.failedBlocks > 0 && (
              <Badge variant='destructive' className='text-xs'>
                {event.failedBlocks} failed
              </Badge>
            )}
          </div>
        </div>

        {/* Block execution card */}
        <div className='flex w-full flex-col space-y-2'>
          <div className='flex-1 space-y-4 rounded-xl border border-border bg-muted p-2'>
            {loading ? (
              <div className='text-muted-foreground text-sm'>Loading block outputs...</div>
            ) : error ? (
              <div className='text-destructive text-sm'>
                Error: {error instanceof Error ? error.message : 'Unknown error'}
              </div>
            ) : blockOutputs.length > 0 ? (
              <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                <CollapsibleTrigger asChild>
                  <Button variant='ghost' size='sm' className='w-full justify-between'>
                    <span>View {blockOutputs.length} block outputs</span>
                    {isExpanded ? (
                      <ChevronUpIcon className='size-4' />
                    ) : (
                      <ChevronDownIcon className='size-4' />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className='mt-3 space-y-3'>
                  {blockOutputs.map((blockOutput) => {
                    const config = getBlockConfig(blockOutput.blockType)
                    const blockColor = config?.bgColor || '#6B7280'
                    return (
                      <div
                        key={blockOutput.id}
                        className='relative rounded-lg'
                        style={{
                          background: `linear-gradient(135deg, ${blockColor}15, ${blockColor}05, ${blockColor}15)`,
                          padding: '1px',
                        }}
                      >
                        <Card
                          className='relative overflow-hidden rounded-lg border-0 bg-card/95 backdrop-blur-xl'
                          style={{
                            boxShadow: `0 1px 1px 0 rgba(0, 0, 0, 0.1)`,
                            background: `linear-gradient(180deg, ${blockColor}10 0%, transparent 10%), var(--card)`,
                          }}
                        >
                          <div
                            className='absolute top-0 right-0 left-0 h-[1.5px] rounded-t-lg'
                            style={{
                              background: `linear-gradient(90deg, transparent 0%, ${blockColor}70 50%, ${blockColor}70 50%, transparent 100%)`,
                            }}
                          />
                          <CardHeader className='p-6'>
                            <div className='flex items-center gap-x-3'>
                              <div className='flex items-center gap-x-2'>
                                {renderBlockIcon(blockOutput.blockType)}
                                <div>
                                  <h4 className='font-medium text-sm'>
                                    {blockOutput.blockName ||
                                      config?.name ||
                                      `${blockOutput.blockType} Block`}
                                  </h4>
                                  <p className='text-muted-foreground text-xs'>
                                    {config?.name || blockOutput.blockType} •{' '}
                                    {formatDuration(blockOutput.durationMs)}
                                  </p>
                                </div>
                              </div>
                              <div className='ml-auto'>
                                {blockOutput.success ? (
                                  <CheckCircleIcon className='size-4 text-green-500' />
                                ) : (
                                  <XCircleIcon className='size-4 text-red-500' />
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className='pt-0'>
                            {blockOutput.success ? (
                              <div className='space-y-2'>
                                {/* <div className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                                                                    Output
                                                                </div> */}
                                <BlockOutputRenderer
                                  blockType={blockOutput.blockType}
                                  output={blockOutput.output}
                                  blockName={blockOutput.blockName || config?.name}
                                />
                              </div>
                            ) : (
                              <div className='space-y-2'>
                                <div className='font-medium text-destructive text-xs uppercase tracking-wide'>
                                  Error
                                </div>
                                <p className='text-destructive text-sm'>
                                  {blockOutput.error || 'Unknown error occurred'}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    )
                  })}
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <div className='text-muted-foreground text-sm'>No block outputs found</div>
            )}
          </div>

          {/* Footer */}
          <div className='flex w-full items-center justify-between'>
            {/* Actor */}
            {event.actor && (
              <div className='flex items-center gap-x-2'>
                <Avatar className='size-5 border border-border'>
                  <AvatarImage src={event.actor.image} alt={event.actor.name} />
                  <AvatarFallback className='text-xs'>
                    {event.actor.name
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span className='text-muted-foreground text-xs'>
                  Executed by {event.actor.name}
                </span>
              </div>
            )}
            {/* Time */}
            <div className='flex items-center gap-x-2 text-muted-foreground text-xs'>
              <ClockIcon className='size-3' />
              {formatDistanceToNow(event.occurredAt, { addSuffix: true })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
