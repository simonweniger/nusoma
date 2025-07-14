'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
//   AlertDialogTrigger,
// } from '@nusoma/design-system/components/ui/alert-dialog'
import { Button } from '@nusoma/design-system/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@nusoma/design-system/components/ui/dropdown-menu'
import { SidebarTrigger } from '@nusoma/design-system/components/ui/sidebar'
//import { Progress } from '@nusoma/design-system/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@nusoma/design-system/components/ui/tooltip'
//import { formatDistanceToNow } from 'date-fns'
import { Bell, History, Loader2, RotateCcw, RotateCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/auth-client'
import { createLogger } from '@/lib/logger/console-logger'
import { cn } from '@/lib/utils'
import { useKeyboardShortcuts } from '@/app/(dashboard)/workspace/hooks/use-keyboard-shortcuts'
import { useUserPermissions } from '@/hooks/use-user-permissions'
//import { useExecutionStore } from '@/stores/execution/store'
import { useNotificationStore } from '@/stores/notifications/store'
import { usePanelStore } from '@/stores/panel/store'
import { useGeneralStore } from '@/stores/settings/general/store'
import { useWorkerRegistry } from '@/stores/workers/registry/store'
import { useSubBlockStore } from '@/stores/workers/subblock/store'
import { mergeSubblockState } from '@/stores/workers/utils'
import { useWorkerStore } from '@/stores/workers/worker/store'
import type { WorkerState } from '@/stores/workers/worker/types'
import { useWorkerExecution } from '../../hooks/use-worker-execution'
import { DeploymentControls } from './components/deployment-controls/deployment-controls'
import { HistoryDropdownItem } from './components/history-dropdown-item/history-dropdown-item'
import { MarketplaceModal } from './components/marketplace-modal/marketplace-modal'
import { NotificationDropdownItem } from './components/notification-dropdown-item/notification-dropdown-item'

const logger = createLogger('ControlBar')

// Cache for usage data to prevent excessive API calls
let usageDataCache = {
  data: null,
  timestamp: 0,
  // Cache expires after 1 minute
  expirationMs: 60 * 1000,
}

// Predefined run count options
// const RUN_COUNT_OPTIONS = [1, 5, 10, 25, 50, 100]

/**
 * Control bar for managing workers - handles editing, deletion, deployment,
 * history, notifications and execution.
 */
export function ControlBar() {
  const router = useRouter()
  const { data: session } = useSession()

  // Store hooks
  const {
    notifications,
    getWorkerNotifications,
    addNotification,
    showNotification,
    removeNotification,
  } = useNotificationStore()
  const {
    lastSaved,
    setNeedsRedeploymentFlag,
    blocks,
    needsRedeployment,
    history,
    undo,
    redo,
    canUndo,
    canRedo,
    revertToHistoryState,
  } = useWorkerStore()
  const { workerValues } = useSubBlockStore()
  const {
    workers,
    updateWorker,
    activeWorkerId,
    activeWorkspaceId,
    removeWorker,
    duplicateWorker,
    setDeploymentStatus,
    isLoading: isRegistryLoading,
  } = useWorkerRegistry()
  const { isExecuting, handleRunWorker } = useWorkerExecution()
  const { setActiveTab } = usePanelStore()

  // Get current worker and workspace ID for permissions
  //const currentWorker = activeWorkerId ? workers[activeWorkerId] : null

  // User permissions - use stable activeWorkspaceId from registry instead of deriving from currentWorker
  const userPermissions = useUserPermissions(activeWorkspaceId)

  // Debug mode state
  const { isDebugModeEnabled, toggleDebugMode } = useGeneralStore()
  const { isDebugging, pendingBlocks, handleStepDebug, handleCancelDebug, handleResumeDebug } =
    useWorkerExecution()

  // Local state
  const [mounted, setMounted] = useState(false)
  const [, forceUpdate] = useState({})

  // Deployed state management
  const [deployedState, setDeployedState] = useState<WorkerState | null>(null)
  const [isLoadingDeployedState, setIsLoadingDeployedState] = useState<boolean>(false)

  // Change detection state
  //  const [changeDetected, setChangeDetected] = useState(false)

  // Worker name editing state
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')

  // Worker description editing state
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editedDescription, setEditedDescription] = useState('')

  // Dropdown states
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  // Marketplace modal state
  const [isMarketplaceModalOpen, setIsMarketplaceModalOpen] = useState(false)

  // Multiple runs state
  const [runCount, setRunCount] = useState(1)
  const [completedRuns, setCompletedRuns] = useState(0)
  const [isMultiRunning, setIsMultiRunning] = useState(false)
  const [showRunProgress, setShowRunProgress] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const cancelFlagRef = useRef(false)

  // Usage limit state
  const [usageExceeded, setUsageExceeded] = useState(false)
  const [usageData, setUsageData] = useState<{
    percentUsed: number
    isWarning: boolean
    isExceeded: boolean
    currentUsage: number
    limit: number
  } | null>(null)

  const isHistoryLoading = false // Placeholder as history is now synchronous
  const historyError = null // Placeholder

  const versions = useMemo(() => {
    if (!history) return []
    const allVersions = [...history.past.slice().reverse(), history.present, ...history.future]
    return allVersions.map((version: any, index: number) => ({
      id: version.timestamp.toString(),
      action: version.action,
      timestamp: version.timestamp,
      isCurrent: index === history.past.length,
      isFuture: index > history.past.length,
    }))
  }, [history])

  // Register keyboard shortcut for running worker
  useKeyboardShortcuts(
    () => {
      if (!isExecuting && !isMultiRunning && !isCancelling) {
        if (isDebugModeEnabled) {
          handleRunWorker()
        } else {
          handleMultipleRuns()
        }
      }
    },
    isExecuting || isMultiRunning || isCancelling
  )

  // Get the marketplace data from the worker registry if available
  const getMarketplaceData = () => {
    if (!activeWorkerId || !workers[activeWorkerId]) return null
    return workers[activeWorkerId].marketplaceData
  }

  // Check if the current worker is published to marketplace
  const _isPublishedToMarketplace = () => {
    const marketplaceData = getMarketplaceData()
    return !!marketplaceData
  }

  // Get deployment status from registry
  const deploymentStatus = useWorkerRegistry((state) =>
    state.getWorkerDeploymentStatus(activeWorkerId)
  )
  const isDeployed = deploymentStatus?.isDeployed || false

  // Client-side only rendering for the timestamp
  useEffect(() => {
    setMounted(true)
  }, [])

  // Update the time display every minute
  useEffect(() => {
    const interval = setInterval(() => forceUpdate({}), 60000)
    return () => clearInterval(interval)
  }, [])

  /**
   * Fetches the deployed state of the worker from the server
   * This is the single source of truth for deployed worker state
   */
  const fetchDeployedState = async () => {
    if (!activeWorkerId || !isDeployed) {
      setDeployedState(null)
      return
    }

    // Store the worker ID at the start of the request to prevent race conditions
    const requestWorkerId = activeWorkerId

    // Helper to get current active worker ID for race condition checks
    const getCurrentActiveWorkerId = () => useWorkerRegistry.getState().activeWorkerId

    try {
      setIsLoadingDeployedState(true)

      const response = await fetch(`/api/workers/${requestWorkerId}/deployed`)

      // Check if the worker ID changed during the request (user navigated away)
      if (requestWorkerId !== getCurrentActiveWorkerId()) {
        logger.debug('Worker changed during deployed state fetch, ignoring response')
        return
      }

      if (!response.ok) {
        if (response.status === 404) {
          setDeployedState(null)
          return
        }
        throw new Error(`Failed to fetch deployed state: ${response.statusText}`)
      }

      const data = await response.json()

      if (requestWorkerId === getCurrentActiveWorkerId()) {
        setDeployedState(data.deployedState || null)
      } else {
        logger.debug('Worker changed after deployed state response, ignoring result')
      }
    } catch (error) {
      logger.error('Error fetching deployed state:', { error })
      if (requestWorkerId === getCurrentActiveWorkerId()) {
        setDeployedState(null)
      }
    } finally {
      if (requestWorkerId === getCurrentActiveWorkerId()) {
        setIsLoadingDeployedState(false)
      }
    }
  }

  useEffect(() => {
    if (!activeWorkerId) {
      setDeployedState(null)
      setIsLoadingDeployedState(false)
      return
    }

    if (isRegistryLoading) {
      setDeployedState(null)
      setIsLoadingDeployedState(false)
      return
    }

    if (isDeployed) {
      setNeedsRedeploymentFlag(false)
      fetchDeployedState()
    } else {
      setDeployedState(null)
      setIsLoadingDeployedState(false)
    }
  }, [activeWorkerId, isDeployed, setNeedsRedeploymentFlag, isRegistryLoading])

  // Get current store state for change detection
  const currentBlocks = useWorkerStore((state) => state.blocks)
  const subBlockValues = useSubBlockStore((state) =>
    activeWorkerId ? state.workerValues[activeWorkerId] : null
  )

  /**
   * Normalize blocks for semantic comparison - only compare what matters functionally
   * Ignores: IDs, positions, dimensions, metadata that don't affect worker logic
   * Compares: type, name, subBlock values
   */
  const normalizeBlocksForComparison = (blocks: Record<string, any>) => {
    if (!blocks) return []

    return Object.values(blocks)
      .map((block: any) => ({
        type: block.type,
        name: block.name,
        subBlocks: block.subBlocks || {},
      }))
      .sort((a, b) => {
        const typeA = a.type || ''
        const typeB = b.type || ''
        if (typeA !== typeB) return typeA.localeCompare(typeB)
        return (a.name || '').localeCompare(b.name || '')
      })
  }

  useEffect(() => {
    if (!activeWorkerId || !deployedState) {
      setNeedsRedeploymentFlag(false)
      return
    }

    if (isLoadingDeployedState) {
      return
    }

    const currentMergedState = mergeSubblockState(currentBlocks, activeWorkerId)

    const deployedBlocks = deployedState?.blocks
    if (!deployedBlocks) {
      setNeedsRedeploymentFlag(false)
      return
    }

    const normalizedCurrentBlocks = normalizeBlocksForComparison(currentMergedState)
    const normalizedDeployedBlocks = normalizeBlocksForComparison(deployedBlocks)

    const hasChanges =
      JSON.stringify(normalizedCurrentBlocks) !== JSON.stringify(normalizedDeployedBlocks)
    setNeedsRedeploymentFlag(hasChanges)
  }, [
    activeWorkerId,
    deployedState,
    currentBlocks,
    subBlockValues,
    isLoadingDeployedState,
    setNeedsRedeploymentFlag,
  ])

  useEffect(() => {
    if (session?.user?.id && !isRegistryLoading) {
      checkUserUsage(session.user.id).then((usage) => {
        if (usage) {
          setUsageExceeded(usage.isExceeded)
          setUsageData(usage)
        }
      })
    }
  }, [session?.user?.id, completedRuns, isRegistryLoading])

  /**
   * Check user usage data with caching to prevent excessive API calls
   * @param userId User ID to check usage for
   * @param forceRefresh Whether to force a fresh API call ignoring cache
   * @returns Usage data or null if error
   */
  async function checkUserUsage(userId: string, forceRefresh = false): Promise<any | null> {
    const now = Date.now()
    const cacheAge = now - usageDataCache.timestamp

    // Use cache if available and not expired
    if (!forceRefresh && usageDataCache.data && cacheAge < usageDataCache.expirationMs) {
      logger.info('Using cached usage data', {
        cacheAge: `${Math.round(cacheAge / 1000)}s`,
      })
      return usageDataCache.data
    }

    try {
      const response = await fetch('/api/user/usage')
      if (!response.ok) {
        throw new Error('Failed to fetch usage data')
      }

      const usage = await response.json()

      // Update cache
      usageDataCache = {
        data: usage,
        timestamp: now,
        expirationMs: usageDataCache.expirationMs,
      }

      return usage
    } catch (error) {
      logger.error('Error checking usage limits:', { error })
      return null
    }
  }

  /**
   * Worker name handlers
   */
  const handleNameClick = () => {
    if (!userPermissions.canEdit) return
    setIsEditingName(true)
    setEditedName(activeWorkerId ? workers[activeWorkerId]?.name || '' : '')
  }

  const handleNameSubmit = () => {
    if (!userPermissions.canEdit) return

    if (editedName.trim() && activeWorkerId) {
      updateWorker(activeWorkerId, { name: editedName.trim() })
    }
    setIsEditingName(false)
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit()
    } else if (e.key === 'Escape') {
      setIsEditingName(false)
    }
  }

  const handleDescriptionClick = () => {
    if (!userPermissions.canEdit) return
    setIsEditingDescription(true)
    setEditedDescription(activeWorkerId ? workers[activeWorkerId]?.description || '' : '')
  }

  const handleDescriptionSubmit = () => {
    if (!userPermissions.canEdit) return
    if (editedDescription.trim() && activeWorkerId) {
      updateWorker(activeWorkerId, { description: editedDescription.trim() })
    }
    setIsEditingDescription(false)
  }

  const handleDescriptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleDescriptionSubmit()
    } else if (e.key === 'Escape') {
      setIsEditingDescription(false)
    }
  }

  /**
   * Handle deleting the current worker
   */
  const handleDeleteWorker = () => {
    if (!activeWorkerId || !userPermissions.canEdit) return

    const workerIds = Object.keys(workers)
    const currentIndex = workerIds.indexOf(activeWorkerId)

    // Find the next worker to navigate to
    let nextWorkerId = null
    if (workerIds.length > 1) {
      // Try next worker, then previous, then any other
      if (currentIndex < workerIds.length - 1) {
        nextWorkerId = workerIds[currentIndex + 1]
      } else if (currentIndex > 0) {
        nextWorkerId = workerIds[currentIndex - 1]
      } else {
        nextWorkerId = workerIds.find((id) => id !== activeWorkerId) || null
      }
    }

    // Navigate to the next worker or home
    if (nextWorkerId) {
      router.push(`/worker/${nextWorkerId}`)
    } else {
      router.push('/')
    }

    // Remove the worker from the registry
    useWorkerRegistry.getState().removeWorker(activeWorkerId)
  }

  // Helper function to open subscription settings
  const openSubscriptionSettings = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('open-settings', {
          detail: { tab: 'subscription' },
        })
      )
    }
  }

  /**
   * Handle running worker multiple times
   */
  const handleMultipleRuns = async () => {
    if (isExecuting || isMultiRunning || runCount <= 0) return

    // Check if usage is exceeded before allowing execution
    if (usageExceeded) {
      openSubscriptionSettings()
      return
    }

    // Switch panel tab to console
    setActiveTab('monitor')

    // Reset state and ref for a new batch of runs
    setCompletedRuns(0)
    setIsMultiRunning(true)
    setIsCancelling(false)
    cancelFlagRef.current = false
    setShowRunProgress(runCount > 1)

    let workerError = null
    let wasCancelled = false
    let runCounter = 0
    let shouldCheckUsage = false

    try {
      // Run the worker multiple times sequentially
      for (let i = 0; i < runCount; i++) {
        // Check for cancellation before starting the next run using the ref
        if (cancelFlagRef.current) {
          logger.info('Multi-run cancellation requested by user.')
          wasCancelled = true
          break
        }

        // Run the worker and immediately increment counter for visual feedback
        await handleRunWorker()
        runCounter = i + 1
        setCompletedRuns(runCounter)

        // Only check usage periodically to avoid excessive API calls
        // Check on first run, every 5 runs, and on last run
        shouldCheckUsage = i === 0 || (i + 1) % 5 === 0 || i === runCount - 1

        // Check usage if needed
        if (shouldCheckUsage && session?.user?.id) {
          const usage = await checkUserUsage(session.user.id, i === 0)

          if (usage?.isExceeded) {
            setUsageExceeded(true)
            setUsageData(usage)
            // Stop execution if we've exceeded the limit during this batch
            if (i < runCount - 1) {
              addNotification(
                'info',
                `Usage limit reached after ${runCounter} runs. Execution stopped.`,
                activeWorkerId
              )
              break
            }
          }
        }
      }

      // Update worker stats only if the run wasn't cancelled and completed normally
      if (!wasCancelled && activeWorkerId) {
        try {
          // Don't block UI on stats update
          fetch(`/api/workers/${activeWorkerId}/stats?runs=${runCounter}`, {
            method: 'POST',
          }).catch((error) => {
            logger.error(`Failed to update worker stats: ${error.message}`)
          })
        } catch (error) {
          logger.error('Error updating worker stats:', { error })
        }
      }
    } catch (error) {
      workerError = error
      logger.error('Error during multiple worker runs:', { error })
    } finally {
      // Always immediately update UI state
      setIsMultiRunning(false)

      // Handle progress bar visibility
      if (runCount > 1) {
        // Keep progress visible briefly after completion
        setTimeout(() => setShowRunProgress(false), 1000)
      } else {
        // Immediately hide progress for single runs
        setShowRunProgress(false)
      }

      setIsCancelling(false)
      cancelFlagRef.current = false

      // Show notification after state is updated
      if (wasCancelled) {
        addNotification('info', 'Worker run cancelled', activeWorkerId)
      } else if (workerError) {
        addNotification('error', 'Failed to complete all worker runs', activeWorkerId)
      }
    }
  }

  /**
   * Handle duplicating the current worker
   */
  const handleDuplicateWorker = () => {
    if (!activeWorkerId || !userPermissions.canEdit) return

    // Duplicate the worker and get the new ID
    const newWorkerId = duplicateWorker(activeWorkerId)

    if (newWorkerId) {
      // Navigate to the new worker
      router.push(`/worker/${newWorkerId}`)
    }
  }

  /**
   * Render worker name section (editable/non-editable)
   */
  const renderWorkerName = () => {
    const canEdit = userPermissions.canEdit

    return (
      <div className='flex flex-col gap-[2px]'>
        {isEditingName ? (
          <input
            type='text'
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={handleNameKeyDown}
            className='w-[200px] border-none bg-transparent p-0 font-medium text-sm outline-none'
          />
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <h2
                className={cn(
                  'w-fit font-medium text-sm',
                  canEdit ? 'cursor-pointer hover:text-muted-foreground' : 'cursor-default'
                )}
                onClick={canEdit ? handleNameClick : undefined}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleNameClick()
                  }
                }}
              >
                {activeWorkerId ? workers[activeWorkerId]?.name : 'Worker'}
              </h2>
            </TooltipTrigger>
            {!canEdit && (
              <TooltipContent>Edit permissions required to rename workers</TooltipContent>
            )}
          </Tooltip>
        )}
        {isEditingDescription ? (
          <input
            type='text'
            value={editedDescription}
            onChange={(e) => setEditedDescription(e.target.value)}
            onBlur={handleDescriptionSubmit}
            onKeyDown={handleDescriptionKeyDown}
            className='w-[200px] border-none bg-transparent p-0 text-muted-foreground text-xs outline-none'
          />
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <p
                className={cn(
                  'w-fit text-muted-foreground text-xs',
                  canEdit ? 'cursor-pointer hover:text-muted-foreground/70' : 'cursor-default'
                )}
                onClick={canEdit ? handleDescriptionClick : undefined}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleDescriptionClick()
                  }
                }}
              >
                {activeWorkerId
                  ? workers[activeWorkerId]?.description || 'No description'
                  : 'No description'}
              </p>
            </TooltipTrigger>
            {!canEdit && (
              <TooltipContent>Edit permissions required to edit description</TooltipContent>
            )}
          </Tooltip>
        )}
        {/* {mounted && (
          <p className='text-muted-foreground text-xs'>
            Saved{' '}
            {formatDistanceToNow(lastSaved || Date.now(), {
              addSuffix: true,
            })}
          </p>
        )} */}
      </div>
    )
  }

  /**
   * Render delete worker button with confirmation dialog
   */
  // const renderDeleteButton = () => {
  //   const canEdit = userPermissions.canEdit
  //   const hasMultipleWorkers = Object.keys(workers).length > 1
  //   const isDisabled = !canEdit || !hasMultipleWorkers

  //   const getTooltipText = () => {
  //     if (!canEdit) return 'Edit permissions required to delete workers'
  //     if (!hasMultipleWorkers) return 'Cannot delete the last worker'
  //     return 'Delete Worker'
  //   }

  //   return (
  //     <AlertDialog>
  //       <Tooltip>
  //         <TooltipTrigger asChild>
  //           <AlertDialogTrigger asChild>
  //             <Button
  //               variant='ghost'
  //               size='icon'
  //               disabled={isDisabled}
  //               className={cn('hover:text-red-600', isDisabled && 'cursor-not-allowed opacity-50')}
  //             >
  //               <Trash2 className='h-5 w-5' />
  //               <span className='sr-only'>Delete Worker</span>
  //             </Button>
  //           </AlertDialogTrigger>
  //         </TooltipTrigger>
  //         <TooltipContent>{getTooltipText()}</TooltipContent>
  //       </Tooltip>

  //       <AlertDialogContent>
  //         <AlertDialogHeader>
  //           <AlertDialogTitle>Delete Worker</AlertDialogTitle>
  //           <AlertDialogDescription>
  //             Are you sure you want to delete this worker? This action cannot be undone.
  //           </AlertDialogDescription>
  //         </AlertDialogHeader>
  //         <AlertDialogFooter>
  //           <AlertDialogCancel>Cancel</AlertDialogCancel>
  //           <AlertDialogAction
  //             onClick={handleDeleteWorker}
  //             className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
  //           >
  //             Delete
  //           </AlertDialogAction>
  //         </AlertDialogFooter>
  //       </AlertDialogContent>
  //     </AlertDialog>
  //   )
  // }

  /**
   * Render deploy button with tooltip
   */
  const renderDeployButton = () => (
    <DeploymentControls
      activeWorkerId={activeWorkerId}
      needsRedeployment={needsRedeployment || false}
      setNeedsRedeployment={setNeedsRedeploymentFlag}
      deployedState={deployedState}
      isLoadingDeployedState={isLoadingDeployedState}
      refetchDeployedState={fetchDeployedState}
      userPermissions={userPermissions}
    />
  )

  /**
   * Render notifications dropdown
   */
  const renderNotificationsDropdown = () => {
    const unreadNotifications = notifications.filter((n) => !n.read)

    return (
      <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' size='icon'>
                <Bell />
                <span className='sr-only'>Notifications</span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          {!notificationsOpen && <TooltipContent>Notifications</TooltipContent>}
        </Tooltip>

        {unreadNotifications.length === 0 ? (
          <DropdownMenuContent align='end' className='w-40'>
            <DropdownMenuItem className='text-muted-foreground text-sm'>
              No new notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        ) : (
          <DropdownMenuContent align='end' className='max-h-[300px] w-60 overflow-y-auto'>
            {[...unreadNotifications]
              .sort((a, b) => b.timestamp - a.timestamp)
              .map((notification) => (
                <NotificationDropdownItem
                  key={notification.id}
                  id={notification.id}
                  type={notification.type}
                  message={notification.message}
                  timestamp={notification.timestamp}
                  options={notification.options}
                  setDropdownOpen={setNotificationsOpen}
                />
              ))}
          </DropdownMenuContent>
        )}
      </DropdownMenu>
    )
  }

  /**
   * Render run worker button with multi-run dropdown and cancel button
   */
  // const renderRunButton = () => {
  //   const canRun = userPermissions.canRead // Running only requires read permissions
  //   const isLoadingPermissions = userPermissions.isLoading
  //   const isButtonDisabled =
  //     isExecuting || isMultiRunning || isCancelling || (!canRun && !isLoadingPermissions)

  //   return (
  //     <div className='flex items-center'>
  //       {showRunProgress && isMultiRunning && (
  //         <div className='mr-3 w-28'>
  //           <Progress value={(completedRuns / runCount) * 100} className='h-2 bg-muted' />
  //           <p className='mt-1 text-center text-muted-foreground text-xs'>
  //             {completedRuns}/{runCount} runs
  //           </p>
  //         </div>
  //       )}

  //       {/* Show how many blocks have been executed in debug mode if debugging */}
  //       {isDebugging && (
  //         <div className='mr-3 min-w-28 rounded bg-muted px-1 py-0.5'>
  //           <div className='text-center text-muted-foreground text-xs'>
  //             <span className='font-medium'>Debugging Mode</span>
  //           </div>
  //         </div>
  //       )}

  //       <div className='ml-1 flex'>
  //         {/* Run/Debug Button Group - Divided Button Style */}
  //         {isDebugModeEnabled || isMultiRunning ? (
  //           // Single button for debug mode or multi-running
  //           <Tooltip>
  //             <TooltipTrigger asChild>
  //               <Button
  //                 onClick={
  //                   usageExceeded
  //                     ? openSubscriptionSettings
  //                     : isDebugModeEnabled
  //                       ? handleRunWorker
  //                       : handleMultipleRuns
  //                 }
  //                 disabled={isButtonDisabled}
  //               >
  //                 {isCancelling ? (
  //                   <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
  //                 ) : isDebugModeEnabled ? (
  //                   <Bug className={cn('mr-1.5 h-3.5 w-3.5', 'fill-current stroke-current')} />
  //                 ) : (
  //                   <Play className={cn('h-3.5 w-3.5', 'fill-current stroke-current')} />
  //                 )}
  //                 {isCancelling
  //                   ? 'Cancelling...'
  //                   : isMultiRunning
  //                     ? `Running (${completedRuns}/${runCount})`
  //                     : isExecuting
  //                       ? isDebugging
  //                         ? 'Debugging'
  //                         : 'Running'
  //                       : isDebugModeEnabled
  //                         ? 'Debug'
  //                         : runCount === 1
  //                           ? 'Run'
  //                           : `Run (${runCount})`}
  //               </Button>
  //             </TooltipTrigger>
  //             <TooltipContent command={getKeyboardShortcutText('Enter', true)}>
  //               {!canRun && !isLoadingPermissions ? (
  //                 'Read permissions required to run workers'
  //               ) : usageExceeded ? (
  //                 <div className='text-center'>
  //                   <p className='font-medium text-destructive'>Usage Limit Exceeded</p>
  //                   <p className='text-xs'>
  //                     You've used {usageData?.currentUsage.toFixed(2)}$ of {usageData?.limit}$.
  //                     Upgrade your plan to continue.
  //                   </p>
  //                 </div>
  //               ) : (
  //                 <>
  //                   {isDebugModeEnabled
  //                     ? 'Debug Worker'
  //                     : runCount === 1
  //                       ? 'Run Worker'
  //                       : `Run Worker ${runCount} times`}
  //                 </>
  //               )}
  //             </TooltipContent>
  //           </Tooltip>
  //         ) : (
  //           // Divided button for normal run mode
  //           <div className='inline-flex divide-x divide-primary-foreground/30 rounded-md shadow-xs'>
  //             <Tooltip>
  //               <TooltipTrigger asChild>
  //                 <Button
  //                   onClick={usageExceeded ? openSubscriptionSettings : handleMultipleRuns}
  //                   disabled={isButtonDisabled}
  //                 >
  //                   {isCancelling ? (
  //                     <Loader2 className='h-3.5 w-3.5 animate-spin opacity-60' aria-hidden='true' />
  //                   ) : (
  //                     <Play
  //                       className={cn('h-3.5 w-3.5 opacity-60', 'fill-current stroke-current')}
  //                       aria-hidden='true'
  //                     />
  //                   )}
  //                   {isCancelling
  //                     ? 'Cancelling...'
  //                     : isExecuting
  //                       ? 'Running'
  //                       : runCount === 1
  //                         ? 'Run'
  //                         : 'Run'}
  //                   {!isCancelling && !isExecuting && runCount > 1 && (
  //                     <span className='-me-1 ms-1 inline-flex h-5 max-h-full items-center rounded border border-primary-foreground/30 px-1 font-[inherit] font-medium text-[0.625rem] text-primary-foreground/60'>
  //                       {runCount}
  //                     </span>
  //                   )}
  //                 </Button>
  //               </TooltipTrigger>
  //               <TooltipContent command={getKeyboardShortcutText('Enter', true)}>
  //                 {!canRun && !isLoadingPermissions ? (
  //                   'Read permissions required to run workers'
  //                 ) : usageExceeded ? (
  //                   <div className='text-center'>
  //                     <p className='font-medium text-destructive'>Usage Limit Exceeded</p>
  //                     <p className='text-xs'>
  //                       You've used {usageData?.currentUsage.toFixed(2)}$ of {usageData?.limit}$.
  //                       Upgrade your plan to continue.
  //                     </p>
  //                   </div>
  //                 ) : (
  //                   <>{runCount === 1 ? 'Run Worker' : `Run Worker ${runCount} times`}</>
  //                 )}
  //               </TooltipContent>
  //             </Tooltip>

  //             <DropdownMenu>
  //               <DropdownMenuTrigger asChild>
  //                 <Button size='icon' aria-label='Run options' disabled={isButtonDisabled}>
  //                   <ChevronDown className='h-4 w-4' aria-hidden='true' />
  //                 </Button>
  //               </DropdownMenuTrigger>
  //               <DropdownMenuContent align='end' className='w-20'>
  //                 {RUN_COUNT_OPTIONS.map((count) => (
  //                   <DropdownMenuItem
  //                     key={count}
  //                     onClick={() => setRunCount(count)}
  //                     className={cn('justify-center', runCount === count && 'bg-muted')}
  //                   >
  //                     {count}
  //                   </DropdownMenuItem>
  //                 ))}
  //               </DropdownMenuContent>
  //             </DropdownMenu>
  //           </div>
  //         )}

  //         {/* Cancel Button - Only show when multi-running */}
  //         {isMultiRunning && (
  //           <Tooltip>
  //             <TooltipTrigger asChild>
  //               <Button
  //                 variant='outline'
  //                 size='icon'
  //                 onClick={() => {
  //                   logger.info('Cancel button clicked - setting ref and state')
  //                   cancelFlagRef.current = true
  //                   setIsCancelling(true)
  //                 }}
  //                 disabled={isCancelling}
  //                 className='ml-2 h-10 w-10'
  //               >
  //                 <X className='h-4 w-4' />
  //                 <span className='sr-only'>Cancel Runs</span>
  //               </Button>
  //             </TooltipTrigger>
  //             <TooltipContent>Cancel Runs</TooltipContent>
  //           </Tooltip>
  //         )}
  //       </div>
  //     </div>
  //   )
  // }

  /**
   * Render debug mode controls
   */
  // const renderDebugControls = () => {
  //   if (!isDebugModeEnabled || !isDebugging) return null

  //   const pendingCount = pendingBlocks.length

  //   return (
  //     <div className='ml-2 flex items-center gap-2 rounded-md bg-muted px-2 py-1'>
  //       <div className='flex flex-col'>
  //         <span className='text-muted-foreground text-xs'>Debug Mode</span>
  //         <span className='font-medium text-xs'>
  //           {pendingCount} block{pendingCount !== 1 ? 's' : ''} pending
  //         </span>
  //       </div>
  //       <Tooltip>
  //         <TooltipTrigger asChild>
  //           <Button
  //             variant='outline'
  //             size='icon'
  //             onClick={handleStepDebug}
  //             className='h-8 w-8 bg-background'
  //             disabled={pendingCount === 0}
  //           >
  //             <StepForward className='h-4 w-4' />
  //           </Button>
  //         </TooltipTrigger>
  //         <TooltipContent>Step Forward</TooltipContent>
  //       </Tooltip>
  //       <Tooltip>
  //         <TooltipTrigger asChild>
  //           <Button
  //             variant='outline'
  //             size='icon'
  //             onClick={handleResumeDebug}
  //             className='h-8 w-8 bg-background'
  //             disabled={pendingCount === 0}
  //           >
  //             <SkipForward className='h-4 w-4' />
  //           </Button>
  //         </TooltipTrigger>
  //         <TooltipContent>Resume Until End</TooltipContent>
  //       </Tooltip>
  //       <Tooltip>
  //         <TooltipTrigger asChild>
  //           <Button
  //             variant='outline'
  //             size='icon'
  //             onClick={handleCancelDebug}
  //             className='h-8 w-8 bg-background'
  //           >
  //             <X className='h-4 w-4' />
  //           </Button>
  //         </TooltipTrigger>
  //         <TooltipContent>Cancel Debugging</TooltipContent>
  //       </Tooltip>
  //     </div>
  //   )
  // }

  /**
   * Render debug mode toggle button
   */
  // const renderDebugModeToggle = () => {
  //   const canDebug = userPermissions.canRead // Debug mode now requires only read permissions

  //   const handleToggleDebugMode = () => {
  //     if (!canDebug) return

  //     if (isDebugModeEnabled) {
  //       if (!isExecuting) {
  //         useExecutionStore.getState().setIsDebugging(false)
  //         useExecutionStore.getState().setPendingBlocks([])
  //       }
  //     }
  //     toggleDebugMode()
  //   }

  //   return (
  //     <Tooltip>
  //       <TooltipTrigger asChild>
  //         <Button
  //           variant='ghost'
  //           size='icon'
  //           onClick={handleToggleDebugMode}
  //           disabled={isExecuting || isMultiRunning || !canDebug}
  //           className={cn(
  //             isDebugModeEnabled && 'text-amber-500',
  //             !canDebug && 'cursor-not-allowed opacity-50'
  //           )}
  //         >
  //           <Bug className='h-5 w-5' />
  //           <span className='sr-only'>Toggle Debug Mode</span>
  //         </Button>
  //       </TooltipTrigger>
  //       <TooltipContent>
  //         {!canDebug
  //           ? 'Read permissions required to use debug mode'
  //           : isDebugModeEnabled
  //             ? 'Disable Debug Mode'
  //             : 'Enable Debug Mode'}
  //       </TooltipContent>
  //     </Tooltip>
  //   )
  // }

  /**
   * Render worker duplicate button
   */
  // const renderDuplicateButton = () => {
  //   const canEdit = userPermissions.canEdit

  //   return (
  //     <Tooltip>
  //       <TooltipTrigger asChild>
  //         <Button
  //           variant='ghost'
  //           size='icon'
  //           onClick={handleDuplicateWorker}
  //           disabled={!canEdit}
  //           className={cn('hover:text-primary', !canEdit && 'cursor-not-allowed opacity-50')}
  //         >
  //           <Copy className='h-5 w-5' />
  //           <span className='sr-only'>Duplicate Worker</span>
  //         </Button>
  //       </TooltipTrigger>
  //       <TooltipContent>
  //         {canEdit ? 'Duplicate Worker' : 'Edit permissions required to duplicate workers'}
  //       </TooltipContent>
  //     </Tooltip>
  //   )
  // }

  const renderHistoryDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon' disabled={isHistoryLoading}>
          <History className='h-4 w-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-56'>
        {canUndo() || canRedo() ? (
          <>
            <div className='flex w-full flex-row justify-between'>
              <DropdownMenuItem onClick={undo} disabled={!canUndo()}>
                <RotateCcw className='mr-2 h-4 w-4' />
                <span>Undo</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={redo} disabled={!canRedo()}>
                <RotateCw className='mr-2 h-4 w-4' />
                <span>Redo</span>
              </DropdownMenuItem>
            </div>
            <DropdownMenuSeparator />
          </>
        ) : null}
        {isHistoryLoading ? (
          <DropdownMenuItem disabled>
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            Loading...
          </DropdownMenuItem>
        ) : historyError ? (
          <DropdownMenuItem disabled className='text-destructive'>
            Error loading history
          </DropdownMenuItem>
        ) : (
          versions.map((version: any, index: number) => (
            <HistoryDropdownItem
              key={version.id || index}
              action={version.action}
              timestamp={version.timestamp}
              isCurrent={version.isCurrent}
              isFuture={version.isFuture}
              onClick={() => {
                useWorkerStore.getState().revertToHistoryState(index)
              }}
            />
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className='flex h-16 w-full items-center justify-between'>
      {/* Left Section - Worker Info */}
      <div className='flex items-center gap-2 pl-4'>
        <SidebarTrigger />
        <div className='font-medium text-sm'>{renderWorkerName()}</div>
      </div>

      {/* Middle Section - Reserved for future use */}
      <div className='flex-1' />

      {/* Right Section - Actions */}
      <div className='flex items-center gap-2 pr-4'>
        {/* {renderDeleteButton()} */}
        {/* {renderDebugControls()}
        {renderDebugModeToggle()} */}
        {/* {renderDuplicateButton()} */}
        {/* {renderRunButton()} */}
        {renderDeployButton()}
        {renderNotificationsDropdown()}
        {renderHistoryDropdown()}

        {/* Add the marketplace modal */}
        <MarketplaceModal open={isMarketplaceModalOpen} onOpenChange={setIsMarketplaceModalOpen} />
      </div>
    </div>
  )
}
