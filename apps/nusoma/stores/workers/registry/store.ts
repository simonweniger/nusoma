import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { createLogger } from '@/lib/logger/console-logger'
import { clearWorkerVariablesTracking } from '@/stores/panel/variables/store'
import { API_ENDPOINTS } from '../../constants'
import { fetchWorkerStateFromDB, fetchWorkersFromDB } from '../database'
import { useSubBlockStore } from '../subblock/store'
import { useWorkerStore } from '../worker/store'
import type { BlockState } from '../worker/types'
import type { DeploymentStatus, WorkerMetadata, WorkerRegistry } from './types'
import { generateUniqueName, getNextWorkerColor } from './utils'

const logger = createLogger('WorkerRegistry')

// Track workspace transitions to prevent race conditions
let isWorkspaceTransitioning = false
const TRANSITION_TIMEOUT = 5000 // 5 seconds maximum for workspace transitions

// Resets worker and subblock stores to prevent data leakage between workspaces
function resetWorkerStores() {
  // Reset variable tracking to prevent stale API calls
  clearWorkerVariablesTracking()

  // Reset the worker store to prevent data leakage between workspaces
  useWorkerStore.setState({
    blocks: {},
    edges: [],
    loops: {},
    isDeployed: false,
    deployedAt: undefined,
    deploymentStatuses: {}, // Reset deployment statuses map
    hasActiveSchedule: false,
    lastSaved: Date.now(),
  })

  // Reset the subblock store
  useSubBlockStore.setState({
    workerValues: {},
    toolParams: {},
  })
}

/**
 * Handles workspace transition state tracking
 * @param isTransitioning Whether workspace is currently transitioning
 */
function setWorkspaceTransitioning(isTransitioning: boolean): void {
  isWorkspaceTransitioning = isTransitioning

  // Set a safety timeout to prevent permanently stuck in transition state
  if (isTransitioning) {
    setTimeout(() => {
      if (isWorkspaceTransitioning) {
        logger.warn('Forcing workspace transition to complete due to timeout')
        isWorkspaceTransitioning = false
      }
    }, TRANSITION_TIMEOUT)
  }
}

/**
 * Checks if workspace is currently in transition
 * @returns True if workspace is transitioning
 */
export function isWorkspaceInTransition(): boolean {
  return isWorkspaceTransitioning
}

export const useWorkerRegistry = create<WorkerRegistry>()(
  devtools(
    (set, get) => ({
      // Store state
      workers: {},
      activeWorkerId: null,
      activeWorkspaceId: null, // No longer persisted in localStorage
      isLoading: true,
      error: null,
      // Initialize deployment statuses
      deploymentStatuses: {},

      // Set loading state
      setLoading: (loading: boolean) => {
        // Remove the broken logic that prevents loading when workers exist
        // This was causing race conditions during deletion and sync operations
        set({ isLoading: loading })
      },

      // Handle cleanup on workspace deletion
      handleWorkspaceDeletion: async (newWorkspaceId: string) => {
        const currentWorkspaceId = get().activeWorkspaceId

        if (!newWorkspaceId || newWorkspaceId === currentWorkspaceId) {
          logger.error('Cannot switch to invalid workspace after deletion')
          return
        }

        // Set transition state
        setWorkspaceTransitioning(true)

        try {
          logger.info(`Switching from deleted workspace ${currentWorkspaceId} to ${newWorkspaceId}`)

          // Reset all worker state
          resetWorkerStores()

          // Set loading state while we fetch workers
          set({
            isLoading: true,
            workers: {},
            activeWorkspaceId: newWorkspaceId,
            activeWorkerId: null,
          })

          // Properly await worker fetching to prevent race conditions
          await fetchWorkersFromDB()

          set({ isLoading: false })
          logger.info(`Successfully switched to workspace after deletion: ${newWorkspaceId}`)
        } catch (error) {
          logger.error('Error fetching workers after workspace deletion:', {
            error,
            workspaceId: newWorkspaceId,
          })
          set({ isLoading: false, error: 'Failed to load workspace data' })
        } finally {
          // End transition state
          setWorkspaceTransitioning(false)
        }
      },

      // Switch to workspace with comprehensive error handling and loading states
      switchToWorkspace: async (workspaceId: string) => {
        // Prevent multiple simultaneous transitions
        if (isWorkspaceTransitioning) {
          logger.warn(
            `Ignoring workspace switch to ${workspaceId} - transition already in progress`
          )
          return
        }

        const { activeWorkspaceId: currentWorkspaceId } = get()

        // Early return if switching to the same workspace (before setting flag)
        if (currentWorkspaceId === workspaceId) {
          logger.info(`Already in workspace ${workspaceId}`)
          return
        }

        // Only set transition flag AFTER validating the switch is needed
        setWorkspaceTransitioning(true)

        try {
          logger.info(`Switching workspace from ${currentWorkspaceId || 'none'} to ${workspaceId}`)

          // Save to localStorage first before any async operations
          get().setActiveWorkspaceId(workspaceId)

          // Clear current workspace state
          resetWorkerStores()

          // Update workspace in state
          set({
            activeWorkspaceId: workspaceId,
            activeWorkerId: null,
            workers: {},
            isLoading: true,
            error: null,
          })

          // Fetch workers for the new workspace
          await fetchWorkersFromDB()

          logger.info(`Successfully switched to workspace: ${workspaceId}`)
        } catch (error) {
          logger.error(`Error switching to workspace ${workspaceId}:`, { error })
          set({
            error: `Failed to switch workspace: ${error instanceof Error ? error.message : 'Unknown error'}`,
            isLoading: false,
          })
        } finally {
          setWorkspaceTransitioning(false)
        }
      },

      // Load user's last active workspace from localStorage
      loadLastActiveWorkspace: async () => {
        try {
          const savedWorkspaceId = localStorage.getItem('lastActiveWorkspaceId')
          if (!savedWorkspaceId || savedWorkspaceId === get().activeWorkspaceId) {
            return // No saved workspace or already active
          }

          logger.info(`Attempting to restore last active workspace: ${savedWorkspaceId}`)

          // Validate that the workspace exists by making a simple API call
          try {
            const response = await fetch('/api/workspaces')
            if (response.ok) {
              const data = await response.json()
              const workspaces = data.workspaces || []
              const workspaceExists = workspaces.some((ws: any) => ws.id === savedWorkspaceId)

              if (workspaceExists) {
                // Set the validated workspace ID
                set({ activeWorkspaceId: savedWorkspaceId })
                logger.info(`Restored last active workspace from localStorage: ${savedWorkspaceId}`)
              } else {
                logger.warn(
                  `Saved workspace ${savedWorkspaceId} no longer exists, clearing from localStorage`
                )
                localStorage.removeItem('lastActiveWorkspaceId')
              }
            }
          } catch (apiError) {
            logger.warn('Failed to validate saved workspace, will use default:', apiError)
            // Don't remove from localStorage in case it's a temporary network issue
          }
        } catch (error) {
          logger.warn('Failed to load last active workspace from localStorage:', error)
          // This is non-critical, so we continue with default behavior
        }
      },

      // Load workspace based on worker ID from URL, with fallback to last active workspace
      loadWorkspaceFromWorkerId: async (workerId: string | null) => {
        try {
          logger.info(`Loading workspace for worker ID: ${workerId}`)

          // If worker ID provided, try to get its workspace
          if (workerId) {
            try {
              const response = await fetch(`/api/workers/${workerId}`)
              if (response.ok) {
                const data = await response.json()
                const worker = data.data

                if (worker?.workspaceId) {
                  // Validate workspace access
                  const workspacesResponse = await fetch('/api/workspaces')
                  if (workspacesResponse.ok) {
                    const workspacesData = await workspacesResponse.json()
                    const workspaces = workspacesData.workspaces || []
                    const workspaceExists = workspaces.some(
                      (ws: any) => ws.id === worker.workspaceId
                    )

                    if (workspaceExists) {
                      set({ activeWorkspaceId: worker.workspaceId })
                      localStorage.setItem('lastActiveWorkspaceId', worker.workspaceId)
                      logger.info(`Set active workspace from worker: ${worker.workspaceId}`)
                      return
                    }
                  }
                }
              }
            } catch (error) {
              logger.warn('Error fetching worker:', error)
            }
          }

          // Fallback: use last active workspace or first available
          const savedWorkspaceId = localStorage.getItem('lastActiveWorkspaceId')
          const response = await fetch('/api/workspaces')

          if (response.ok) {
            const data = await response.json()
            const workspaces = data.workspaces || []

            if (workspaces.length === 0) {
              logger.warn('No workspaces found')
              return
            }

            // Try saved workspace first
            let targetWorkspace = savedWorkspaceId
              ? workspaces.find((ws: any) => ws.id === savedWorkspaceId)
              : null

            // Fall back to first workspace
            if (!targetWorkspace) {
              targetWorkspace = workspaces[0]
              if (savedWorkspaceId) {
                localStorage.removeItem('lastActiveWorkspaceId')
              }
            }

            set({ activeWorkspaceId: targetWorkspace.id })
            localStorage.setItem('lastActiveWorkspaceId', targetWorkspace.id)
            logger.info(`Set active workspace: ${targetWorkspace.id}`)
          }
        } catch (error) {
          logger.error('Error in loadWorkspaceFromWorkerId:', error)
        }
      },

      // Simple method to set active workspace ID without triggering full switch
      setActiveWorkspaceId: (id: string) => {
        set({ activeWorkspaceId: id })
        // Save to localStorage as well
        try {
          localStorage.setItem('lastActiveWorkspaceId', id)
        } catch (error) {
          logger.warn('Failed to save workspace to localStorage:', error)
        }
      },

      // Method to get deployment status for a specific worker
      getWorkerDeploymentStatus: (workerId: string | null): DeploymentStatus | null => {
        if (!workerId) {
          // If no worker ID provided, check the active worker
          workerId = get().activeWorkerId
          if (!workerId) return null
        }

        const { deploymentStatuses = {} } = get()

        // Get from the worker-specific deployment statuses in the registry
        if (deploymentStatuses[workerId]) {
          return deploymentStatuses[workerId]
        }

        // No deployment status found
        return null
      },

      // Method to set deployment status for a specific worker
      setDeploymentStatus: (
        workerId: string | null,
        isDeployed: boolean,
        deployedAt?: Date,
        apiKey?: string
      ) => {
        if (!workerId) {
          workerId = get().activeWorkerId
          if (!workerId) return
        }

        // Update the deployment statuses in the registry
        set((state) => ({
          deploymentStatuses: {
            ...state.deploymentStatuses,
            [workerId as string]: {
              isDeployed,
              deployedAt: deployedAt || (isDeployed ? new Date() : undefined),
              apiKey,
              // Preserve existing needsRedeployment flag if available, but reset if newly deployed
              needsRedeployment: isDeployed
                ? false
                : ((state.deploymentStatuses?.[workerId as string] as any)?.needsRedeployment ??
                  false),
            },
          },
        }))

        // Also update the worker store if this is the active worker
        const { activeWorkerId } = get()
        if (workerId === activeWorkerId) {
          // Update the worker store for backward compatibility
          useWorkerStore.setState((state) => ({
            isDeployed,
            deployedAt: deployedAt || (isDeployed ? new Date() : undefined),
            needsRedeployment: isDeployed ? false : state.needsRedeployment,
            deploymentStatuses: {
              ...state.deploymentStatuses,
              [workerId as string]: {
                isDeployed,
                deployedAt: deployedAt || (isDeployed ? new Date() : undefined),
                apiKey,
                needsRedeployment: isDeployed
                  ? false
                  : ((state.deploymentStatuses?.[workerId as string] as any)?.needsRedeployment ??
                    false),
              },
            },
          }))
        }
      },

      // Method to set the needsRedeployment flag for a specific worker
      setWorkerNeedsRedeployment: (workerId: string | null, needsRedeployment: boolean) => {
        if (!workerId) {
          workerId = get().activeWorkerId
          if (!workerId) return
        }

        // Update the registry's deployment status for this specific worker
        set((state) => {
          const deploymentStatuses = state.deploymentStatuses || {}
          const currentStatus = deploymentStatuses[workerId as string] || { isDeployed: false }

          return {
            deploymentStatuses: {
              ...deploymentStatuses,
              [workerId as string]: {
                ...currentStatus,
                needsRedeployment,
              },
            },
          }
        })

        // Only update the global flag if this is the active worker
        const { activeWorkerId } = get()
        if (workerId === activeWorkerId) {
          useWorkerStore.getState().setNeedsRedeploymentFlag(needsRedeployment)
        }
      },

      // Modified setActiveWorker to work with clean DB-only architecture
      setActiveWorker: async (id: string) => {
        const { workers, activeWorkerId } = get()
        if (!workers[id]) {
          logger.info(`Attempting to fetch worker ${id} directly from database`)
          try {
            const response = await fetch(`/api/workers/${id}`)
            if (response.ok) {
              const { data: workerData } = await response.json()
              if (workerData?.workspaceId) {
                logger.info(
                  `Found worker ${id} in workspace ${workerData.workspaceId}, switching workspace`
                )
                // Switch to the correct workspace first
                await get().switchToWorkspace(workerData.workspaceId)
                // Now the worker should be available, try again
                return get().setActiveWorker(id)
              }
            }
          } catch (error) {
            logger.error(`Failed to fetch worker ${id} from database:`, error)
          }

          set({ error: `Worker ${id} not found` })
          return
        }

        // Update active workspace to match the worker's workspace
        const worker = workers[id]
        if (worker.workspaceId) {
          const currentActiveWorkspaceId = get().activeWorkspaceId
          if (currentActiveWorkspaceId !== worker.workspaceId) {
            logger.info(
              `Updating active workspace from ${currentActiveWorkspaceId} to ${worker.workspaceId} to match worker ${id}`
            )
            set({ activeWorkspaceId: worker.workspaceId })
            localStorage.setItem('lastActiveWorkspaceId', worker.workspaceId)
          }
        }

        // Fetch worker state from database
        const workerData = await fetchWorkerStateFromDB(id)

        let workerState: any

        if (workerData?.state) {
          // Use the state from the database
          workerState = {
            blocks: workerData.state.blocks || {},
            edges: workerData.state.edges || [],
            loops: workerData.state.loops || {},
            parallels: workerData.state.parallels || {},
            isDeployed: workerData.isDeployed || false,
            deployedAt: workerData.deployedAt ? new Date(workerData.deployedAt) : undefined,
            apiKey: workerData.apiKey,
            lastSaved: Date.now(),
            marketplaceData: workerData.marketplaceData || null,
            deploymentStatuses: {},
            hasActiveSchedule: false,
            history: {
              past: [],
              present: {
                state: workerData.state,
                timestamp: Date.now(),
                action: 'Loaded from database',
                subblockValues: {},
              },
              future: [],
            },
          }

          // Check if worker is missing a starter block and add one if needed
          const hasStarterBlock = Object.values(workerState.blocks).some(
            (block: any) => block.type === 'starter'
          )

          if (!hasStarterBlock) {
            logger.info(`Worker ${id} is missing starter block, adding one`)
            const starterId = crypto.randomUUID()
            const starterBlock = {
              id: starterId,
              type: 'starter' as const,
              name: 'Start',
              position: { x: 100, y: 100 },
              subBlocks: {
                startWorker: {
                  id: 'startWorker',
                  type: 'dropdown' as const,
                  value: 'manual',
                },
                webhookPath: {
                  id: 'webhookPath',
                  type: 'short-input' as const,
                  value: '',
                },
                webhookSecret: {
                  id: 'webhookSecret',
                  type: 'short-input' as const,
                  value: '',
                },
                scheduleType: {
                  id: 'scheduleType',
                  type: 'dropdown' as const,
                  value: 'daily',
                },
                minutesInterval: {
                  id: 'minutesInterval',
                  type: 'short-input' as const,
                  value: '',
                },
                minutesStartingAt: {
                  id: 'minutesStartingAt',
                  type: 'short-input' as const,
                  value: '',
                },
                hourlyMinute: {
                  id: 'hourlyMinute',
                  type: 'short-input' as const,
                  value: '',
                },
                dailyTime: {
                  id: 'dailyTime',
                  type: 'short-input' as const,
                  value: '',
                },
                weeklyDay: {
                  id: 'weeklyDay',
                  type: 'dropdown' as const,
                  value: 'MON',
                },
                weeklyDayTime: {
                  id: 'weeklyDayTime',
                  type: 'short-input' as const,
                  value: '',
                },
                monthlyDay: {
                  id: 'monthlyDay',
                  type: 'short-input' as const,
                  value: '',
                },
                monthlyTime: {
                  id: 'monthlyTime',
                  type: 'short-input' as const,
                  value: '',
                },
                cronExpression: {
                  id: 'cronExpression',
                  type: 'short-input' as const,
                  value: '',
                },
                timezone: {
                  id: 'timezone',
                  type: 'dropdown' as const,
                  value: 'UTC',
                },
              },
              outputs: {
                response: {
                  type: {
                    input: 'any',
                  },
                },
              },
              enabled: true,
              horizontalHandles: false,
              isWide: false,
              height: 0,
            }

            // Add the starter block to the blocks
            workerState.blocks[starterId] = starterBlock

            // Initialize subblock values for the new starter block
            const starterSubblockValues: Record<string, any> = {}
            Object.entries(starterBlock.subBlocks).forEach(([subblockId, subblock]) => {
              starterSubblockValues[subblockId] = (subblock as any).value
            })

            // Update subblock store for the starter block
            const currentSubblockValues = useSubBlockStore.getState().workerValues[id] || {}
            currentSubblockValues[starterId] = starterSubblockValues

            useSubBlockStore.setState((state) => ({
              workerValues: {
                ...state.workerValues,
                [id]: currentSubblockValues,
              },
            }))
          }

          // Extract and update subblock values
          const subblockValues: Record<string, Record<string, any>> = {}
          Object.entries(workerState.blocks).forEach(([blockId, block]) => {
            const blockState = block as any
            subblockValues[blockId] = {}
            Object.entries(blockState.subBlocks || {}).forEach(([subblockId, subblock]) => {
              subblockValues[blockId][subblockId] = (subblock as any).value
            })
          })

          // Update subblock store for this worker
          useSubBlockStore.setState((state) => ({
            workerValues: {
              ...state.workerValues,
              [id]: subblockValues,
            },
          }))
        } else {
          // If no state in DB, initialize with starter block (for newly created workers)
          const starterId = crypto.randomUUID()
          const starterBlock = {
            id: starterId,
            type: 'starter' as const,
            name: 'Start',
            position: { x: 100, y: 100 },
            subBlocks: {
              startWorker: {
                id: 'startWorker',
                type: 'dropdown' as const,
                value: 'manual',
              },
              webhookPath: {
                id: 'webhookPath',
                type: 'short-input' as const,
                value: '',
              },
              webhookSecret: {
                id: 'webhookSecret',
                type: 'short-input' as const,
                value: '',
              },
              scheduleType: {
                id: 'scheduleType',
                type: 'dropdown' as const,
                value: 'daily',
              },
              minutesInterval: {
                id: 'minutesInterval',
                type: 'short-input' as const,
                value: '',
              },
              minutesStartingAt: {
                id: 'minutesStartingAt',
                type: 'short-input' as const,
                value: '',
              },
              hourlyMinute: {
                id: 'hourlyMinute',
                type: 'short-input' as const,
                value: '',
              },
              dailyTime: {
                id: 'dailyTime',
                type: 'short-input' as const,
                value: '',
              },
              weeklyDay: {
                id: 'weeklyDay',
                type: 'dropdown' as const,
                value: 'MON',
              },
              weeklyDayTime: {
                id: 'weeklyDayTime',
                type: 'short-input' as const,
                value: '',
              },
              monthlyDay: {
                id: 'monthlyDay',
                type: 'short-input' as const,
                value: '',
              },
              monthlyTime: {
                id: 'monthlyTime',
                type: 'short-input' as const,
                value: '',
              },
              cronExpression: {
                id: 'cronExpression',
                type: 'short-input' as const,
                value: '',
              },
              timezone: {
                id: 'timezone',
                type: 'dropdown' as const,
                value: 'UTC',
              },
            },
            outputs: {
              response: {
                type: {
                  input: 'any',
                },
              },
            },
            enabled: true,
            horizontalHandles: false,
            isWide: false,
            height: 0,
          }

          workerState = {
            blocks: { [starterId]: starterBlock },
            edges: [],
            loops: {},
            parallels: {},
            isDeployed: false,
            deployedAt: undefined,
            deploymentStatuses: {},
            hasActiveSchedule: false,
            history: {
              past: [],
              present: {
                state: {
                  blocks: { [starterId]: starterBlock },
                  edges: [],
                  loops: {},
                  parallels: {},
                  isDeployed: false,
                  deployedAt: undefined,
                },
                timestamp: Date.now(),
                action: 'Initial state with starter block',
                subblockValues: {},
              },
              future: [],
            },
            lastSaved: Date.now(),
          }

          // Initialize subblock values for starter block
          const subblockValues: Record<string, Record<string, any>> = {}
          subblockValues[starterId] = {}
          Object.entries(starterBlock.subBlocks).forEach(([subblockId, subblock]) => {
            subblockValues[starterId][subblockId] = (subblock as any).value
          })

          useSubBlockStore.setState((state) => ({
            workerValues: {
              ...state.workerValues,
              [id]: subblockValues,
            },
          }))
        }

        // Set the worker state in the store
        useWorkerStore.setState(workerState)

        // CRITICAL: Set deployment status in registry when switching to worker
        if (workerData?.isDeployed || workerData?.deployedAt) {
          set((state) => ({
            deploymentStatuses: {
              ...state.deploymentStatuses,
              [id]: {
                isDeployed: workerData.isDeployed || false,
                deployedAt: workerData.deployedAt ? new Date(workerData.deployedAt) : undefined,
                apiKey: workerData.apiKey || undefined,
                needsRedeployment: false, // Default to false when loading from DB
              },
            },
          }))
        }

        // Update the active worker ID
        set({ activeWorkerId: id, error: null })

        logger.info(`Switched to worker ${id}`)
      },

      /**
       * Creates a new worker with appropriate metadata and initial blocks
       * @param options - Optional configuration for worker creation
       * @returns The ID of the newly created worker
       */
      createWorker: (options = {}) => {
        const { workers, activeWorkspaceId } = get()
        const id = crypto.randomUUID()

        // Use provided workspace ID or fall back to active workspace ID
        const workspaceId = options.workspaceId || activeWorkspaceId || undefined

        logger.info(`Creating new worker in workspace: ${workspaceId || 'none'}`)

        // Generate worker metadata with appropriate name and color
        const newWorker: WorkerMetadata = {
          id,
          name: options.name || generateUniqueName(workers),
          lastModified: new Date(),
          description: options.description || 'New worker',
          color: options.marketplaceId ? '#808080' : getNextWorkerColor(workers), // Gray for marketplace imports
          marketplaceData: options.marketplaceId
            ? { id: options.marketplaceId, status: 'temp' as const }
            : undefined,
          workspaceId, // Associate with workspace
          folderId: options.folderId || null, // Associate with folder if provided
          blocks: {},
        }

        let initialState: any

        // If this is a marketplace import with existing state
        if (options.marketplaceId && options.marketplaceState) {
          initialState = {
            blocks: options.marketplaceState.blocks || {},
            edges: options.marketplaceState.edges || [],
            loops: options.marketplaceState.loops || {},
            parallels: options.marketplaceState.parallels || {},
            isDeployed: false,
            deployedAt: undefined,
            deploymentStatuses: {}, // Initialize empty deployment statuses map
            workspaceId, // Include workspace ID in the state object
            history: {
              past: [],
              present: {
                state: {
                  blocks: options.marketplaceState.blocks || {},
                  edges: options.marketplaceState.edges || [],
                  loops: options.marketplaceState.loops || {},
                  parallels: options.marketplaceState.parallels || {},
                  isDeployed: false,
                  deployedAt: undefined,
                  workspaceId, // Include workspace ID in history
                },
                timestamp: Date.now(),
                action: 'Imported from marketplace',
                subblockValues: {},
              },
              future: [],
            },
            lastSaved: Date.now(),
          }

          logger.info(`Created worker from marketplace: ${options.marketplaceId}`)
        } else {
          // Create starter block for new worker
          const starterId = crypto.randomUUID()
          const starterBlock = {
            id: starterId,
            type: 'starter' as const,
            name: 'Start',
            position: { x: 100, y: 100 },
            subBlocks: {
              startWorker: {
                id: 'startWorker',
                type: 'dropdown' as const,
                value: 'manual',
              },
              webhookPath: {
                id: 'webhookPath',
                type: 'short-input' as const,
                value: '',
              },
              webhookSecret: {
                id: 'webhookSecret',
                type: 'short-input' as const,
                value: '',
              },
              scheduleType: {
                id: 'scheduleType',
                type: 'dropdown' as const,
                value: 'daily',
              },
              minutesInterval: {
                id: 'minutesInterval',
                type: 'short-input' as const,
                value: '',
              },
              minutesStartingAt: {
                id: 'minutesStartingAt',
                type: 'short-input' as const,
                value: '',
              },
              hourlyMinute: {
                id: 'hourlyMinute',
                type: 'short-input' as const,
                value: '',
              },
              dailyTime: {
                id: 'dailyTime',
                type: 'short-input' as const,
                value: '',
              },
              weeklyDay: {
                id: 'weeklyDay',
                type: 'dropdown' as const,
                value: 'MON',
              },
              weeklyDayTime: {
                id: 'weeklyDayTime',
                type: 'short-input' as const,
                value: '',
              },
              monthlyDay: {
                id: 'monthlyDay',
                type: 'short-input' as const,
                value: '',
              },
              monthlyTime: {
                id: 'monthlyTime',
                type: 'short-input' as const,
                value: '',
              },
              cronExpression: {
                id: 'cronExpression',
                type: 'short-input' as const,
                value: '',
              },
              timezone: {
                id: 'timezone',
                type: 'dropdown' as const,
                value: 'UTC',
              },
            },
            outputs: {
              response: {
                type: {
                  input: 'any',
                },
              },
            },
            enabled: true,
            horizontalHandles: false,
            isWide: false,
            height: 0,
          }

          initialState = {
            blocks: {
              [starterId]: starterBlock,
            },
            edges: [],
            loops: {},
            parallels: {},
            isDeployed: false,
            deployedAt: undefined,
            deploymentStatuses: {}, // Initialize empty deployment statuses map
            workspaceId, // Include workspace ID in the state object
            history: {
              past: [],
              present: {
                state: {
                  blocks: {
                    [starterId]: starterBlock,
                  },
                  edges: [],
                  loops: {},
                  parallels: {},
                  isDeployed: false,
                  deployedAt: undefined,
                  workspaceId, // Include workspace ID in history
                },
                timestamp: Date.now(),
                action: 'Initial state',
                subblockValues: {},
              },
              future: [],
            },
            lastSaved: Date.now(),
          }
        }

        // Add worker to registry first
        set((state) => ({
          workers: {
            ...state.workers,
            [id]: newWorker,
          },
          error: null,
        }))

        // Initialize subblock values if this is a marketplace import
        if (options.marketplaceId && options.marketplaceState?.blocks) {
          useSubBlockStore.getState().initializeFromWorker(id, options.marketplaceState.blocks)
        }

        // Initialize subblock values to ensure they're available for sync
        if (!options.marketplaceId) {
          // For non-marketplace workers, initialize subblock values from the starter block
          const subblockValues: Record<string, Record<string, any>> = {}
          const blocks = initialState.blocks as Record<string, BlockState>
          for (const [blockId, block] of Object.entries(blocks)) {
            subblockValues[blockId] = {}
            for (const [subblockId, subblock] of Object.entries(block.subBlocks)) {
              subblockValues[blockId][subblockId] = (subblock as any).value
            }
          }

          // Update the subblock store with the initial values
          useSubBlockStore.setState((state) => ({
            workerValues: {
              ...state.workerValues,
              [id]: subblockValues,
            },
          }))
        }

        // Properly set as active worker and initialize state
        set({ activeWorkerId: id })
        useWorkerStore.setState(initialState)

        logger.info(`Created new worker with ID ${id} in workspace ${workspaceId || 'none'}`)

        return id
      },

      /**
       * Creates a new worker from a marketplace worker
       */
      createMarketplaceWorker: (
        marketplaceId: string,
        state: any,
        metadata: Partial<WorkerMetadata>
      ) => {
        const { workers } = get()
        const id = crypto.randomUUID()

        // Generate worker metadata with marketplace properties
        const newWorker: WorkerMetadata = {
          id,
          name: metadata.name || 'Marketplace worker',
          lastModified: new Date(),
          description: metadata.description || 'Imported from marketplace',
          color: metadata.color || getNextWorkerColor(workers),
          marketplaceData: { id: marketplaceId, status: 'temp' as const },
          blocks: {},
        }

        // Prepare worker state based on the marketplace worker state
        const initialState = {
          blocks: state.blocks || {},
          edges: state.edges || [],
          loops: state.loops || {},
          parallels: state.parallels || {},
          isDeployed: false,
          deployedAt: undefined,
          history: {
            past: [],
            present: {
              state: {
                blocks: state.blocks || {},
                edges: state.edges || [],
                loops: state.loops || {},
                parallels: state.parallels || {},
                isDeployed: false,
                deployedAt: undefined,
              },
              timestamp: Date.now(),
              action: 'Imported from marketplace',
              subblockValues: {},
            },
            future: [],
          },
          lastSaved: Date.now(),
        }

        // Add worker to registry
        set((state) => ({
          workers: {
            ...state.workers,
            [id]: newWorker,
          },
          error: null,
        }))

        // Initialize subblock values from state blocks
        if (state.blocks) {
          useSubBlockStore.getState().initializeFromWorker(id, state.blocks)
        }

        // Set as active worker and update store
        set({ activeWorkerId: id })
        useWorkerStore.setState(initialState)

        logger.info(`Created marketplace worker ${id} imported from ${marketplaceId}`)

        return id
      },

      /**
       * Duplicates an existing worker
       */
      duplicateWorker: (sourceId: string) => {
        const { workers, activeWorkspaceId } = get()
        const sourceWorker = workers[sourceId]

        if (!sourceWorker) {
          set({ error: `Worker ${sourceId} not found` })
          return null
        }

        const id = crypto.randomUUID()

        // Get the workspace ID from the source worker or fall back to active workspace
        const workspaceId = sourceWorker.workspaceId || activeWorkspaceId || undefined

        // Generate new worker metadata
        const newWorker: WorkerMetadata = {
          id,
          name: `${sourceWorker.name} (Copy)`,
          lastModified: new Date(),
          description: sourceWorker.description,
          color: getNextWorkerColor(workers),
          workspaceId, // Include the workspaceId in the new worker
          blocks: sourceWorker.blocks || {},
        }

        // Get the current worker state to copy from
        const currentWorkerState = useWorkerStore.getState()

        // If we're duplicating the active worker, use current state
        // Otherwise, we need to fetch it from DB or use empty state
        let sourceState: any

        if (sourceId === get().activeWorkerId) {
          // Source is the active worker, copy current state
          sourceState = {
            blocks: currentWorkerState.blocks || {},
            edges: currentWorkerState.edges || [],
            loops: currentWorkerState.loops || {},
            parallels: currentWorkerState.parallels || {},
          }
        } else {
          // Source is not active worker, create with starter block for now
          // In a future enhancement, we could fetch from DB
          const starterId = crypto.randomUUID()
          const starterBlock = {
            id: starterId,
            type: 'starter' as const,
            name: 'Start',
            position: { x: 100, y: 100 },
            subBlocks: {
              startWorker: {
                id: 'startWorker',
                type: 'dropdown' as const,
                value: 'manual',
              },
              webhookPath: {
                id: 'webhookPath',
                type: 'short-input' as const,
                value: '',
              },
              webhookSecret: {
                id: 'webhookSecret',
                type: 'short-input' as const,
                value: '',
              },
              scheduleType: {
                id: 'scheduleType',
                type: 'dropdown' as const,
                value: 'daily',
              },
              minutesInterval: {
                id: 'minutesInterval',
                type: 'short-input' as const,
                value: '',
              },
              minutesStartingAt: {
                id: 'minutesStartingAt',
                type: 'short-input' as const,
                value: '',
              },
              hourlyMinute: {
                id: 'hourlyMinute',
                type: 'short-input' as const,
                value: '',
              },
              dailyTime: {
                id: 'dailyTime',
                type: 'short-input' as const,
                value: '',
              },
              weeklyDay: {
                id: 'weeklyDay',
                type: 'dropdown' as const,
                value: 'MON',
              },
              weeklyDayTime: {
                id: 'weeklyDayTime',
                type: 'short-input' as const,
                value: '',
              },
              monthlyDay: {
                id: 'monthlyDay',
                type: 'short-input' as const,
                value: '',
              },
              monthlyTime: {
                id: 'monthlyTime',
                type: 'short-input' as const,
                value: '',
              },
              cronExpression: {
                id: 'cronExpression',
                type: 'short-input' as const,
                value: '',
              },
              timezone: {
                id: 'timezone',
                type: 'dropdown' as const,
                value: 'UTC',
              },
            },
            outputs: {
              response: {
                type: {
                  input: 'any',
                },
              },
            },
            enabled: true,
            horizontalHandles: false,
            isWide: false,
            height: 0,
          }

          sourceState = {
            blocks: { [starterId]: starterBlock },
            edges: [],
            loops: {},
            parallels: {},
          }
        }

        // Create the new worker state with copied content
        const newState = {
          blocks: sourceState.blocks,
          edges: sourceState.edges,
          loops: sourceState.loops,
          parallels: sourceState.parallels,
          isDeployed: false,
          deployedAt: undefined,
          workspaceId,
          deploymentStatuses: {},
          history: {
            past: [],
            present: {
              state: {
                blocks: sourceState.blocks,
                edges: sourceState.edges,
                loops: sourceState.loops,
                parallels: sourceState.parallels,
                isDeployed: false,
                deployedAt: undefined,
                workspaceId,
              },
              timestamp: Date.now(),
              action: 'Duplicated worker',
              subblockValues: {},
            },
            future: [],
          },
          lastSaved: Date.now(),
        }

        // Add worker to registry
        set((state) => ({
          workers: {
            ...state.workers,
            [id]: newWorker,
          },
          error: null,
        }))

        // Copy subblock values if duplicating active worker
        if (sourceId === get().activeWorkerId) {
          const sourceSubblockValues = useSubBlockStore.getState().workerValues[sourceId] || {}
          useSubBlockStore.setState((state) => ({
            workerValues: {
              ...state.workerValues,
              [id]: sourceSubblockValues,
            },
          }))
        } else {
          // Initialize subblock values for starter block
          const subblockValues: Record<string, Record<string, any>> = {}
          Object.entries(newState.blocks).forEach(([blockId, block]) => {
            const blockState = block as any
            subblockValues[blockId] = {}
            Object.entries(blockState.subBlocks || {}).forEach(([subblockId, subblock]) => {
              subblockValues[blockId][subblockId] = (subblock as any).value
            })
          })

          useSubBlockStore.setState((state) => ({
            workerValues: {
              ...state.workerValues,
              [id]: subblockValues,
            },
          }))
        }

        // Set as active worker and update store
        set({ activeWorkerId: id })
        useWorkerStore.setState(newState)

        logger.info(`Duplicated worker ${sourceId} to ${id} in workspace ${workspaceId || 'none'}`)

        return id
      },

      // Delete worker and clean up associated storage
      removeWorker: async (id: string) => {
        const { workers } = get()
        const workerToDelete = workers[id]

        if (!workerToDelete) {
          logger.warn(`Attempted to delete non-existent worker: ${id}`)
          return
        }
        set({ isLoading: true, error: null })

        try {
          // Call DELETE endpoint to remove from database
          const response = await fetch(`/api/workers/${id}`, {
            method: 'DELETE',
          })

          if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }))
            throw new Error(error.error || 'Failed to delete worker')
          }

          logger.info(`Successfully deleted worker ${id} from database`)
        } catch (error) {
          logger.error(`Failed to delete worker ${id} from database:`, error)
          set({
            error: `Failed to delete worker: ${error instanceof Error ? error.message : 'Unknown error'}`,
            isLoading: false,
          })
          return
        }

        // Only update local state after successful deletion from database
        set((state) => {
          const newWorkers = { ...state.workers }
          delete newWorkers[id]

          // Clean up subblock values for this worker
          useSubBlockStore.setState((subBlockState) => {
            const newWorkerValues = { ...subBlockState.workerValues }
            delete newWorkerValues[id]
            return { workerValues: newWorkerValues }
          })

          // If deleting active worker, switch to another one or clear state
          let newActiveWorkerId = state.activeWorkerId
          if (state.activeWorkerId === id) {
            const remainingIds = Object.keys(newWorkers)
            newActiveWorkerId = remainingIds[0] || null

            // Ensure the worker we're switching to actually exists
            if (newActiveWorkerId && !newWorkers[newActiveWorkerId]) {
              logger.warn(`Attempted to switch to non-existent worker ${newActiveWorkerId}`)
              newActiveWorkerId = null
            }

            if (!newActiveWorkerId) {
              // No workers left, initialize empty state
              useWorkerStore.setState({
                blocks: {},
                edges: [],
                loops: {},
                parallels: {},
                isDeployed: false,
                deployedAt: undefined,
                hasActiveSchedule: false,
                lastSaved: Date.now(),
              })
            }
          }

          // Cancel any schedule for this worker (async, don't wait)
          fetch(API_ENDPOINTS.SCHEDULE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workerId: id,
              state: {
                blocks: {},
                edges: [],
                loops: {},
              },
            }),
          }).catch((error) => {
            logger.error(`Error cancelling schedule for deleted worker ${id}:`, error)
          })

          logger.info(`Removed worker ${id} from local state`)

          return {
            workers: newWorkers,
            activeWorkerId: newActiveWorkerId,
            error: null,
            isLoading: false, // Clear loading state after successful deletion
          }
        })
      },

      // Update worker metadata
      updateWorker: (id: string, metadata: Partial<WorkerMetadata>) => {
        set((state) => {
          const worker = state.workers[id]
          if (!worker) return state

          const updatedWorkers = {
            ...state.workers,
            [id]: {
              ...worker,
              ...metadata,
              lastModified: new Date(),
            },
          }
          return {
            workers: updatedWorkers,
            error: null,
          }
        })
      },

      logout: () => {
        logger.info('Logging out - clearing all worker data')

        // Clear all state
        resetWorkerStores()

        set({
          workers: {},
          activeWorkerId: null,
          activeWorkspaceId: null,
          isLoading: true,
          error: null,
        })

        logger.info('Logout complete - all worker data cleared')
      },
    }),
    { name: 'worker-registry' }
  )
)
