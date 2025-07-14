import { useEffect, useState } from 'react'
import { createLogger } from '@/lib/logger/console-logger'
import { useWorkerRegistry } from '@/stores/workers/registry/store'
import { useSubBlockStore } from '@/stores/workers/subblock/store'
import { useWorkerStore } from '@/stores/workers/worker/store'

const logger = createLogger('useDeploymentChangeDetection')

/**
 * Hook to detect when a deployed worker needs redeployment due to changes
 * Handles debouncing, API checks, and state synchronization
 */
export function useDeploymentChangeDetection(activeWorkerId: string | null, isDeployed: boolean) {
  const [needsRedeployment, setNeedsRedeployment] = useState(false)

  // Listen for worker changes and check if redeployment is needed
  useEffect(() => {
    if (!activeWorkerId || !isDeployed) {
      return
    }

    // Create a debounced function to check for changes
    let debounceTimer: NodeJS.Timeout | null = null
    let lastCheckTime = 0
    let pendingChanges = 0
    const DEBOUNCE_DELAY = 1000
    const THROTTLE_INTERVAL = 3000

    // Store the current worker ID when the effect runs
    const effectWorkerId = activeWorkerId

    // Function to check if redeployment is needed
    const checkForChanges = async () => {
      // No longer skip if we're already showing needsRedeployment
      // This allows us to detect when changes have been reverted

      // Reset the pending changes counter
      pendingChanges = 0
      lastCheckTime = Date.now()

      // Store the current worker ID to check for race conditions
      const requestedWorkerId = activeWorkerId
      logger.debug(`Checking for changes in worker ${requestedWorkerId}`)

      try {
        // Get the deployed state from the API
        const response = await fetch(`/api/workers/${requestedWorkerId}/status`)
        if (response.ok) {
          const data = await response.json()
          logger.debug(
            `Full API response for worker ${requestedWorkerId}:`,
            JSON.stringify(data, null, 2)
          )

          // Verify the active worker hasn't changed while fetching
          if (requestedWorkerId !== activeWorkerId) {
            logger.debug(
              `Ignoring changes response for ${requestedWorkerId} - no longer the active worker`
            )
            return
          }

          logger.debug(
            `API needsRedeployment response for worker ${requestedWorkerId}: ${data.needsRedeployment}`
          )

          // Always update the needsRedeployment flag based on API response to handle both true and false
          // This ensures it's updated when changes are detected and when changes are no longer detected
          if (data.needsRedeployment) {
            logger.info(`Setting needsRedeployment flag to TRUE for worker ${requestedWorkerId}`)

            // Update local state
            setNeedsRedeployment(true)

            // Use the worker-specific method to update the registry
            useWorkerRegistry.getState().setWorkerNeedsRedeployment(requestedWorkerId, true)
          } else {
            // Only update to false if the current state is true to avoid unnecessary updates
            const currentStatus = useWorkerRegistry
              .getState()
              .getWorkerDeploymentStatus(requestedWorkerId)
            if (currentStatus?.needsRedeployment) {
              logger.info(`Setting needsRedeployment flag to FALSE for worker ${requestedWorkerId}`)

              // Update local state
              setNeedsRedeployment(false)

              // Use the worker-specific method to update the registry
              useWorkerRegistry.getState().setWorkerNeedsRedeployment(requestedWorkerId, false)
            }
          }
        } else {
          // Log error response if not ok
          try {
            const errorText = await response.text()
            logger.error(
              `API request failed for worker ${requestedWorkerId} with status ${response.status}:`,
              errorText
            )
          } catch (e) {
            logger.error(
              `API request failed and failed to parse error response text for worker ${requestedWorkerId} with status ${response.status}:`,
              e
            )
          }
        }
      } catch (error) {
        logger.error('Failed to check worker change status:', { error })
      }
    }

    // Debounced check function
    const debouncedCheck = () => {
      // Skip if the active worker has changed
      if (effectWorkerId !== activeWorkerId) {
        return
      }

      // Increment the pending changes counter
      pendingChanges++

      // Clear any existing timer
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }

      // If we recently checked, and it's within throttle interval, wait longer
      const timeElapsed = Date.now() - lastCheckTime
      if (timeElapsed < THROTTLE_INTERVAL && lastCheckTime > 0) {
        // Wait until the throttle interval has passed
        const adjustedDelay = Math.max(THROTTLE_INTERVAL - timeElapsed, DEBOUNCE_DELAY)

        debounceTimer = setTimeout(() => {
          // Only check if we have pending changes and worker ID hasn't changed
          if (pendingChanges > 0 && effectWorkerId === activeWorkerId) {
            checkForChanges()
          }
        }, adjustedDelay)
      } else {
        // Standard debounce delay if we haven't checked recently
        debounceTimer = setTimeout(() => {
          // Only check if we have pending changes and worker ID hasn't changed
          if (pendingChanges > 0 && effectWorkerId === activeWorkerId) {
            checkForChanges()
          }
        }, DEBOUNCE_DELAY)
      }
    }

    // Subscribe to worker store changes
    const workerUnsubscribe = useWorkerStore.subscribe(debouncedCheck)

    // Also subscribe to subblock store changes
    const subBlockUnsubscribe = useSubBlockStore.subscribe((state) => {
      // Only check for the active worker when it's deployed
      if (!activeWorkerId || !isDeployed) {
        return
      }

      // Skip if the worker ID has changed since this effect started
      if (effectWorkerId !== activeWorkerId) {
        return
      }

      // Only trigger when there is an update to the current worker's subblocks
      const workerSubBlocks = state.workerValues[effectWorkerId]
      if (workerSubBlocks && Object.keys(workerSubBlocks).length > 0) {
        debouncedCheck()
      }
    })

    // Set up a periodic check when needsRedeployment is true to ensure it gets set back to false
    // when changes are reverted
    let periodicCheckTimer: NodeJS.Timeout | null = null

    if (needsRedeployment) {
      // Check every 5 seconds when needsRedeployment is true to catch reverted changes
      const PERIODIC_CHECK_INTERVAL = 5000 // 5 seconds

      periodicCheckTimer = setInterval(() => {
        // Only perform the check if this is still the active worker
        if (effectWorkerId === activeWorkerId) {
          checkForChanges()
        } else {
          // Clear the interval if the worker has changed
          if (periodicCheckTimer) {
            clearInterval(periodicCheckTimer)
          }
        }
      }, PERIODIC_CHECK_INTERVAL)
    }

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
      if (periodicCheckTimer) {
        clearInterval(periodicCheckTimer)
      }
      workerUnsubscribe()
      subBlockUnsubscribe()
    }
  }, [activeWorkerId, isDeployed, needsRedeployment])

  // Initial check on mount or when active worker changes
  useEffect(() => {
    async function checkDeploymentStatus() {
      if (!activeWorkerId) {
        return
      }

      try {
        // Store the current worker ID to check for race conditions
        const requestedWorkerId = activeWorkerId

        const response = await fetch(`/api/workers/${requestedWorkerId}/status`)
        if (response.ok) {
          const data = await response.json()
          logger.debug(
            `Full API response (initial check) for worker ${requestedWorkerId}:`,
            JSON.stringify(data, null, 2)
          )

          // Verify the active worker hasn't changed while fetching
          if (requestedWorkerId !== activeWorkerId) {
            return
          }

          // Update the store with the status from the API
          useWorkerRegistry
            .getState()
            .setDeploymentStatus(
              requestedWorkerId,
              data.isDeployed,
              data.deployedAt ? new Date(data.deployedAt) : undefined
            )

          // Update local state
          setNeedsRedeployment(data.needsRedeployment)

          // Use the worker-specific method to update the registry
          useWorkerRegistry
            .getState()
            .setWorkerNeedsRedeployment(requestedWorkerId, data.needsRedeployment)
        } else {
          // Log error response if not ok (for initial check)
          try {
            const errorText = await response.text()
            logger.error(
              `Initial API request failed for worker ${requestedWorkerId} with status ${response.status}:`,
              errorText
            )
          } catch (e) {
            logger.error(
              `Initial API request failed and failed to parse error response text for worker ${requestedWorkerId} with status ${response.status}:`,
              e
            )
          }
        }
      } catch (error) {
        logger.error('Failed to check worker status:', { error })
      }
    }
    checkDeploymentStatus()
  }, [activeWorkerId])

  // Listen for deployment status changes
  useEffect(() => {
    // When deployment status changes and isDeployed becomes true,
    // that means a deployment just occurred, so reset the needsRedeployment flag
    if (isDeployed) {
      // Update local state
      setNeedsRedeployment(false)

      // Use the worker-specific method to update the registry
      if (activeWorkerId) {
        useWorkerRegistry.getState().setWorkerNeedsRedeployment(activeWorkerId, false)
      }
    }
  }, [isDeployed, activeWorkerId])

  // Add a listener for the needsRedeployment flag in the worker store
  useEffect(() => {
    const unsubscribe = useWorkerStore.subscribe((state) => {
      // Only update local state when it's for the currently active worker
      if (state.needsRedeployment !== undefined) {
        // Get the worker-specific needsRedeployment flag for the current worker
        const currentWorkerStatus = useWorkerRegistry
          .getState()
          .getWorkerDeploymentStatus(activeWorkerId)

        // Only set local state based on current worker's status
        if (currentWorkerStatus?.needsRedeployment !== undefined) {
          setNeedsRedeployment(currentWorkerStatus.needsRedeployment)
        } else {
          // Fallback to global state only if we don't have worker-specific status
          setNeedsRedeployment(state.needsRedeployment)
        }
      }
    })

    return () => unsubscribe()
  }, [activeWorkerId])

  // Function to clear the redeployment flag
  const clearNeedsRedeployment = () => {
    // Update local state
    setNeedsRedeployment(false)

    // Use the worker-specific method to update the registry
    if (activeWorkerId) {
      useWorkerRegistry.getState().setWorkerNeedsRedeployment(activeWorkerId, false)
    }
  }

  return {
    needsRedeployment,
    setNeedsRedeployment,
    clearNeedsRedeployment,
  }
}
