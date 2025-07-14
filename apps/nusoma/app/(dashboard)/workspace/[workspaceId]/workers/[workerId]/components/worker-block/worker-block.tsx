/** biome-ignore-all lint/a11y/useKeyWithClickEvents: ignore */
/** biome-ignore-all lint/a11y/noStaticElementInteractions: ignore */
import { memo, useEffect, useRef, useState } from 'react'
import { Badge } from '@nusoma/design-system/components/ui/badge'
import { Card } from '@nusoma/design-system/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@nusoma/design-system/components/ui/tooltip'
import { cn } from '@nusoma/design-system/lib/utils'
import { Handle, type NodeProps, Position, useUpdateNodeInternals } from '@xyflow/react'
import { parseCronToHumanReadable } from '@/lib/schedules/utils'
import { formatDateTime, validateName } from '@/lib/utils'
import type { BlockConfig } from '@/blocks/types'
import { useUserPermissions } from '@/hooks/use-user-permissions'
import { useExecutionStore } from '@/stores/execution/store'
import { usePanelStore } from '@/stores/panel/store'
import { useWorkerRegistry } from '@/stores/workers/registry/store'
import { useWorkerStore } from '@/stores/workers/worker/store'
import { ActionBar } from './components/action-bar/action-bar'

type CustomNodeData = {
  type: string
  config: BlockConfig
  name: string
  isActive?: boolean
  isPending?: boolean
  conditions?: { id: string; title: string }[]
  otherUserSelection?: {
    blockId: string
    user: { name: string }
    connectionId: string
    color: string
  }
}

// Component for worker blocks - memoized for performance
export const WorkerBlock = memo((props: NodeProps) => {
  const { id, data } = props
  const nodeData = data as CustomNodeData
  const {
    type,
    config,
    name,
    isActive: dataIsActive,
    isPending,
    conditions,
    otherUserSelection,
  } = nodeData
  // State management
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [isLoadingScheduleInfo, setIsLoadingScheduleInfo] = useState(false)
  const [scheduleInfo, setScheduleInfo] = useState<{
    scheduleTiming: string
    nextRunAt: string | null
    lastRanAt: string | null
    timezone: string
    status?: string
    isDisabled?: boolean
    id?: string
  } | null>(null)
  const [webhookInfo, setWebhookInfo] = useState<{
    webhookPath: string
    provider: string
  } | null>(null)

  // Refs
  const blockRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const updateNodeInternals = useUpdateNodeInternals()

  // Panel store
  const { setSelectedBlockId, selectedBlockId } = usePanelStore()

  // Worker store selectors
  const lastUpdate = useWorkerStore((state) => state.lastUpdate)
  const isEnabled = useWorkerStore((state) => state.blocks[id]?.enabled ?? true)
  const horizontalHandles = useWorkerStore((state) => state.blocks[id]?.horizontalHandles ?? false)
  const isWide = useWorkerStore((state) => state.blocks[id]?.isWide ?? false)
  const blockHeight = useWorkerStore((state) => state.blocks[id]?.height ?? 0)
  const hasActiveWebhook = useWorkerStore((state) => state.hasActiveWebhook ?? false)

  // Worker store actions
  const updateBlockName = useWorkerStore((state) => state.updateBlockName)
  const updateBlockHeight = useWorkerStore((state) => state.updateBlockHeight)

  // Execution store
  const isActiveBlock = useExecutionStore((state) => state.activeBlockIds.has(id))
  const isActive = dataIsActive || isActiveBlock

  // Selection state
  const isSelectedByOther = !!otherUserSelection
  const isSelected = selectedBlockId === id

  const reactivateSchedule = async (scheduleId: string) => {
    try {
      const response = await fetch(`/api/schedules/${scheduleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'reactivate' }),
      })

      if (response.ok) {
        fetchScheduleInfo()
      } else {
      }
    } catch (_error) {}
  }

  const fetchScheduleInfo = async () => {
    try {
      setIsLoadingScheduleInfo(true)
      const workerId = useWorkerRegistry.getState().activeWorkerId
      if (!workerId) {
        return
      }

      const response = await fetch(`/api/schedules?workerId=${workerId}&mode=schedule`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })

      if (!response.ok) {
        setScheduleInfo(null)
        return
      }

      const data = await response.json()

      if (!data.schedule) {
        setScheduleInfo(null)
        return
      }

      let scheduleTiming = 'Unknown schedule'
      if (data.schedule.cronExpression) {
        scheduleTiming = parseCronToHumanReadable(data.schedule.cronExpression)
      }

      const baseInfo = {
        scheduleTiming,
        nextRunAt: data.schedule.nextRunAt as string | null,
        lastRanAt: data.schedule.lastRanAt as string | null,
        timezone: data.schedule.timezone || 'UTC',
        status: data.schedule.status as string,
        isDisabled: data.schedule.status === 'disabled',
        id: data.schedule.id as string,
      }

      try {
        const statusRes = await fetch(`/api/schedules/${baseInfo.id}/status`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        })

        if (statusRes.ok) {
          const statusData = await statusRes.json()
          setScheduleInfo({
            scheduleTiming: baseInfo.scheduleTiming,
            nextRunAt: statusData.nextRunAt ?? baseInfo.nextRunAt,
            lastRanAt: statusData.lastRanAt ?? baseInfo.lastRanAt,
            timezone: baseInfo.timezone,
            status: statusData.status ?? baseInfo.status,
            isDisabled: statusData.isDisabled ?? baseInfo.isDisabled,
            id: baseInfo.id,
          })
          return
        }
      } catch (_err) {}

      setScheduleInfo(baseInfo)
    } catch (_error) {
      setScheduleInfo(null)
    } finally {
      setIsLoadingScheduleInfo(false)
    }
  }

  useEffect(() => {
    if (type === 'starter') {
      fetchScheduleInfo()
    } else {
      setScheduleInfo(null)
    }
  }, [type])

  // Get webhook information for the tooltip
  useEffect(() => {
    if (type === 'starter' && hasActiveWebhook) {
      const fetchWebhookInfo = async () => {
        try {
          const workerId = useWorkerRegistry.getState().activeWorkerId
          if (!workerId) {
            return
          }

          const response = await fetch(`/api/webhooks?workerId=${workerId}`)
          if (response.ok) {
            const data = await response.json()
            if (data.webhooks?.[0]?.webhook) {
              const webhook = data.webhooks[0].webhook
              setWebhookInfo({
                webhookPath: webhook.path || '',
                provider: webhook.provider || 'generic',
              })
            }
          }
        } catch (_error) {}
      }

      fetchWebhookInfo()
    } else if (!hasActiveWebhook) {
      setWebhookInfo(null)
    }
  }, [type, hasActiveWebhook])

  // Update node internals when handles change
  useEffect(() => {
    updateNodeInternals(id)
  }, [id, horizontalHandles, updateNodeInternals])

  // Update node internals when conditions change
  useEffect(() => {
    if (type === 'condition' && conditions) {
      updateNodeInternals(id)
    }
  }, [id, type, conditions, updateNodeInternals])

  const debounce = (func: (...args: any[]) => void, wait: number) => {
    let timeout: NodeJS.Timeout
    return (...args: any[]) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }
  }

  // Add effect to observe size changes with debounced updates - optimized
  useEffect(() => {
    if (!contentRef.current) {
      return
    }

    let rafId: number
    const debouncedUpdate = debounce((height: number) => {
      if (Math.abs(height - blockHeight) > 2) {
        // Only update if significant change

        updateBlockHeight(id, height)
        updateNodeInternals(id)
      }
    }, 200) // Increased debounce from 100ms to 200ms

    const resizeObserver = new ResizeObserver((entries) => {
      // Cancel any pending animation frame
      if (rafId) {
        cancelAnimationFrame(rafId)
      }

      // Schedule the update on the next animation frame
      rafId = requestAnimationFrame(() => {
        for (const entry of entries) {
          const height =
            entry.borderBoxSize[0]?.blockSize ?? entry.target.getBoundingClientRect().height
          debouncedUpdate(height)
        }
      })
    })

    resizeObserver.observe(contentRef.current)

    return () => {
      resizeObserver.disconnect()
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [id, blockHeight, updateBlockHeight, updateNodeInternals, lastUpdate])

  // Name editing handlers
  const handleNameClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent drag handler from interfering
    setEditedName(name)
    setIsEditing(true)
  }

  // Auto-focus the input when edit mode is activated
  useEffect(() => {
    if (isEditing && nameInputRef.current) {
      nameInputRef.current.focus()
    }
  }, [isEditing])

  // Handle node name change with validation
  const handleNodeNameChange = (newName: string) => {
    const validatedName = validateName(newName)
    setEditedName(validatedName.slice(0, 18))
  }

  const handleNameSubmit = () => {
    const trimmedName = editedName.trim().slice(0, 18)
    if (trimmedName && trimmedName !== name) {
      updateBlockName(id, trimmedName)
    }
    setIsEditing(false)
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
    }
  }

  // Check if this is a starter block and has active schedule or webhook
  const isStarterBlock = type === 'starter'
  const showWebhookIndicator = isStarterBlock && hasActiveWebhook

  const getProviderName = (providerId: string): string => {
    const providers: Record<string, string> = {
      whatsapp: 'WhatsApp',
      github: 'GitHub',
      discord: 'Discord',
      stripe: 'Stripe',
      generic: 'General',
      slack: 'Slack',
      airtable: 'Airtable',
      gmail: 'Gmail',
    }
    return providers[providerId] || 'Webhook'
  }

  const shouldShowScheduleBadge = isStarterBlock && !isLoadingScheduleInfo && scheduleInfo !== null
  const workerId = useWorkerRegistry((state) => state.activeWorkerId)
  const currentWorker = useWorkerRegistry((state) => (workerId ? state.workers[workerId] : null))
  const workspaceId = currentWorker?.workspaceId || null
  const userPermissions = useUserPermissions(workspaceId)

  return (
    <div className={cn(' relative', isWide ? 'w-[480px]' : 'w-[320px]')}>
      <div>
        <Card
          ref={blockRef}
          draggable={false}
          onClick={() => {
            setSelectedBlockId(id)
          }}
          onDragStart={(e) => {
            e.preventDefault()
          }}
          className={cn(
            '-mb-4 relative w-full rounded-xl bg-card font-mono shadow-[0_1px_1px_rgba(0,0,0,0.02),_0_2px_2px_rgba(0,0,0,0.02),_0_4px_4px_rgba(0,0,0,0.02),_0_8px_8px_rgba(0,0,0,0.02),_0_16px_16px_rgba(0,0,0,0.02),_0_32px_32px_rgba(0,0,0,0.02)]',
            'transition-block-bg transition-ring',
            !isEnabled && 'shadow-elevation-low',
            isActive && 'animate-pulse-ring ring-2 ring-primary ring-offset-2',
            isPending && 'ring-2 ring-amber-500 ring-offset-2',
            isSelected && !isActive && !isPending && 'border border-primary ring-4 ring-primary/20',
            isSelectedByOther && !isActive && !isPending && !isSelected && 'ring-2',
            'z-[20]',
            'cursor-pointer hover:shadow-lg'
          )}
          style={
            {
              ...(isSelectedByOther &&
                !isActive &&
                !isPending &&
                !isSelected && {
                  '--tw-ring-color': otherUserSelection?.color,
                }),
            } as React.CSSProperties
          }
        >
          {/* Show debug indicator for pending blocks */}
          {isPending && (
            <div className='-top-6 -translate-x-1/2 absolute left-1/2 z-10 transform rounded-t-md bg-amber-500 px-2 py-0.5 text-white text-xs'>
              Next Step
            </div>
          )}

          {/* Show indicator when selected by another user */}
          {isSelectedByOther && (
            <div
              className='-top-6 absolute right-4 z-10 rounded-t-md px-2 py-0.5 text-white text-xs'
              style={{ backgroundColor: otherUserSelection?.color }}
            >
              {otherUserSelection?.user.name}
            </div>
          )}

          {/* Input Handle - Don't show for starter blocks */}
          {type !== 'starter' && (
            <Handle
              type='target'
              position={horizontalHandles ? Position.Left : Position.Top}
              id={`target`}
              className={cn(
                horizontalHandles ? '!w-[7px] !h-5' : '!w-5 !h-[7px]',
                '!bg-slate-300 dark:!bg-slate-500 !rounded-[2px] !border-none',
                '!z-[30]',
                'group-hover:!shadow-[0_0_0_3px_rgba(156,163,175,0.15)]',
                horizontalHandles
                  ? 'hover:!w-[10px] hover:!left-[-10px] hover:!rounded-l-full hover:!rounded-r-none'
                  : 'hover:!h-[10px] hover:!top-[-10px] hover:!rounded-t-full hover:!rounded-b-none',
                '!cursor-crosshair',
                'transition-[colors] duration-150',
                horizontalHandles ? '!left-[-7px]' : '!top-[-7px]'
              )}
              style={{
                ...(horizontalHandles
                  ? { top: '50%', transform: 'translateY(-50%)' }
                  : { left: '50%', transform: 'translateX(-50%)' }),
              }}
              data-nodeid={id}
              data-handleid='target'
              isConnectableStart={false}
              isConnectableEnd={true}
              isValidConnection={(connection) => connection.source !== id}
            />
          )}

          {/* Block Header */}
          <div className='flex items-center justify-between bg-gradient-to-t from-background/70 px-4 py-3 dark:from-background/30'>
            <div className='flex min-w-0 flex-1 items-center gap-3'>
              <div
                className='flex h-7 w-7 flex-shrink-0 items-center justify-center rounded'
                style={{ backgroundColor: isEnabled ? config.bgColor : 'gray' }}
              >
                <config.icon className='h-5 w-5 text-white' />
              </div>
              <div className='min-w-0'>
                {isEditing ? (
                  <input
                    ref={nameInputRef}
                    type='text'
                    value={editedName}
                    onChange={(e) => handleNodeNameChange(e.target.value)}
                    onBlur={handleNameSubmit}
                    onKeyDown={handleNameKeyDown}
                    className='border-none bg-transparent p-0 font-medium text-md outline-none'
                    maxLength={18}
                  />
                ) : (
                  <span
                    className={cn(
                      'inline-block cursor-text font-medium text-md hover:text-muted-foreground',
                      !isEnabled && 'text-muted-foreground'
                    )}
                    onClick={handleNameClick}
                    title={name}
                    style={{
                      maxWidth: isEnabled ? '180px' : isWide ? '200px' : '140px',
                    }}
                  >
                    {name}
                  </span>
                )}
              </div>
            </div>
            <div className='flex flex-shrink-0 items-center gap-2'>
              {!isEnabled && (
                <Badge variant='secondary' className='bg-gray-100 text-gray-500 hover:bg-gray-100'>
                  Disabled
                </Badge>
              )}
              {/* Schedule indicator badge - displayed for starter blocks with active schedules */}
              {shouldShowScheduleBadge && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant='outline'
                      className={cn(
                        'flex items-center gap-1 font-normal text-xs',
                        scheduleInfo?.isDisabled
                          ? 'cursor-pointer border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400'
                          : 'border-green-200 bg-green-50 text-green-600 hover:bg-green-50 dark:bg-green-900/20 dark:text-green-400'
                      )}
                      onClick={
                        scheduleInfo?.isDisabled && scheduleInfo?.id
                          ? () => reactivateSchedule(scheduleInfo.id!)
                          : undefined
                      }
                    >
                      <div className='relative mr-0.5 flex items-center justify-center'>
                        <div
                          className={cn(
                            'absolute h-3 w-3 rounded-full',
                            scheduleInfo?.isDisabled ? 'bg-amber-500/20' : 'bg-green-500/20'
                          )}
                        />
                        <div
                          className={cn(
                            'relative h-2 w-2 rounded-full',
                            scheduleInfo?.isDisabled ? 'bg-amber-500' : 'bg-green-500'
                          )}
                        />
                      </div>
                      {scheduleInfo?.isDisabled ? 'Disabled' : 'Scheduled'}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side='top' className='max-w-[300px] p-4'>
                    {scheduleInfo ? (
                      <>
                        <p className='text-sm'>{scheduleInfo.scheduleTiming}</p>
                        {scheduleInfo.isDisabled && (
                          <p className='mt-1 font-medium text-amber-600 text-sm'>
                            This schedule is currently disabled due to consecutive failures. Click
                            the badge to reactivate it.
                          </p>
                        )}
                        {scheduleInfo.nextRunAt && !scheduleInfo.isDisabled && (
                          <p className='mt-1 text-muted-foreground text-xs'>
                            Next run:{' '}
                            {formatDateTime(
                              new Date(scheduleInfo.nextRunAt),
                              scheduleInfo.timezone
                            )}
                          </p>
                        )}
                        {scheduleInfo.lastRanAt && (
                          <p className='text-muted-foreground text-xs'>
                            Last run:{' '}
                            {formatDateTime(
                              new Date(scheduleInfo.lastRanAt),
                              scheduleInfo.timezone
                            )}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className='text-muted-foreground text-sm'>
                        This worker is running on a schedule.
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              )}
              {/* Webhook indicator badge - displayed for starter blocks with active webhooks */}
              {showWebhookIndicator && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant='outline'
                      className='flex items-center gap-1 border-green-200 bg-green-50 font-normal text-green-600 text-xs hover:bg-green-50 dark:bg-green-900/20 dark:text-green-400'
                    >
                      <div className='relative mr-0.5 flex items-center justify-center'>
                        <div className='absolute h-3 w-3 rounded-full bg-green-500/20' />
                        <div className='relative h-2 w-2 rounded-full bg-green-500' />
                      </div>
                      Webhook
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side='top' className='max-w-[300px] p-4'>
                    {webhookInfo ? (
                      <>
                        <p className='text-sm'>{getProviderName(webhookInfo.provider)} Webhook</p>
                        <p className='mt-1 text-muted-foreground text-xs'>
                          Path: {webhookInfo.webhookPath}
                        </p>
                      </>
                    ) : (
                      <p className='text-muted-foreground text-sm'>
                        This worker is triggered by a webhook.
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </Card>
        <ActionBar blockId={id} blockType={type} disabled={!userPermissions.canEdit} />
      </div>
      {/* Output Handle */}
      {type !== 'condition' && type !== 'response' && (
        <>
          <Handle
            type='source'
            position={horizontalHandles ? Position.Right : Position.Bottom}
            id={`source`}
            className={cn(
              horizontalHandles ? '!w-[7px] !h-5' : '!w-5 !h-[7px]',
              '!bg-slate-300 dark:!bg-slate-500 !rounded-[2px] !border-none',
              '!z-[30]',
              'group-hover:!shadow-[0_0_0_3px_rgba(156,163,175,0.15)]',
              horizontalHandles
                ? 'hover:!w-[10px] hover:!right-[-10px] hover:!rounded-r-full hover:!rounded-l-none'
                : 'hover:!h-[10px] hover:!bottom-[-10px] hover:!rounded-b-full hover:!rounded-t-none',
              '!cursor-crosshair',
              'transition-[colors] duration-150',
              horizontalHandles ? '!right-[-7px]' : '!bottom-[-7px]'
            )}
            style={{
              ...(horizontalHandles
                ? { top: '50%', transform: 'translateY(-50%)' }
                : { left: '50%', transform: 'translateX(-50%)' }),
            }}
            data-nodeid={id}
            data-handleid='source'
            isConnectableStart={true}
            isConnectableEnd={true}
            isValidConnection={(connection) => {
              const nodes = useWorkerStore.getState().blocks
              const targetNode = nodes[connection.target]
              return targetNode?.type !== 'starter'
            }}
          />

          {/* Error Handle - Don't show for starter blocks */}
          {/* {type !== 'starter' && isAdvancedMode && (
            <Handle
              type='source'
              position={horizontalHandles ? Position.Right : Position.Bottom}
              id='error'
              className={cn(
                horizontalHandles ? '!w-[7px] !h-5' : '!w-5 !h-[7px]',
                '!bg-red-400 dark:!bg-red-500 !rounded-[2px] !border-none',
                '!z-[30]',
                'group-hover:!shadow-[0_0_0_3px_rgba(248,113,113,0.15)]',
                horizontalHandles
                  ? 'hover:!w-[10px] hover:!right-[-10px] hover:!rounded-r-full hover:!rounded-l-none'
                  : 'hover:!h-[10px] hover:!bottom-[-10px] hover:!rounded-b-full hover:!rounded-t-none',
                '!cursor-crosshair',
                'transition-[colors] duration-150'
              )}
              style={{
                position: 'absolute',
                ...(horizontalHandles
                  ? {
                    right: '-8px',
                    top: 'auto',
                    bottom: '30px',
                    transform: 'translateY(0)',
                  }
                  : {
                    bottom: '-7px',
                    left: 'auto',
                    right: '30px',
                    transform: 'translateX(0)',
                  }),
              }}
              data-nodeid={id}
              data-handleid='error'
              isConnectableStart={true}
              isConnectableEnd={false}
              isValidConnection={(connection) => connection.target !== id}
            />
          )} */}
        </>
      )}
      {type === 'condition' &&
        nodeData.conditions &&
        nodeData.conditions.map((condition, index) => (
          <div key={condition.id}>
            <Handle
              type='source'
              position={Position.Bottom}
              id={condition.id}
              style={{
                left: `${(100 / (nodeData.conditions!.length + 1)) * (index + 1)}%`,
              }}
              className={cn(
                '!w-5 !h-[7px]',
                '!bg-slate-300 dark:!bg-slate-500 !rounded-[2px] !border-none',
                '!z-[30]',
                'group-hover:!shadow-[0_0_0_3px_rgba(156,163,175,0.15)]',
                'hover:!h-[10px] hover:!bottom-[-10px] hover:!rounded-b-full hover:!rounded-t-none',
                '!cursor-crosshair',
                'transition-[colors] duration-150',
                '!bottom-[-7px]'
              )}
              data-nodeid={id}
              data-handleid={condition.id}
              isConnectableStart={true}
              isConnectableEnd={true}
              isValidConnection={(connection) => {
                const nodes = useWorkerStore.getState().blocks
                const targetNode = nodes[connection.target]
                return targetNode?.type !== 'starter'
              }}
            />
            <div
              className='-bottom-12 absolute text-center text-muted-foreground text-xs'
              style={{
                left: `${(100 / (nodeData.conditions!.length + 1)) * (index + 1)}%`,
                transform: 'translateX(-50%)',
              }}
            >
              {condition.title}
            </div>
          </div>
        ))}
    </div>
  )
})

WorkerBlock.displayName = 'WorkerBlock'
