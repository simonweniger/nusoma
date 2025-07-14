'use client'

import { useEffect } from 'react'
import { createLogger } from '@/lib/logger/console-logger'
import { useCopilotStore } from './copilot/store'
import { useCustomToolsStore } from './custom-tools/store'
import { useExecutionStore } from './execution/store'
import { useNotificationStore } from './notifications/store'
import { useConsoleStore } from './panel/console/store'
import { useVariablesStore } from './panel/variables/store'
import { useEnvironmentStore } from './settings/environment/store'
import { fetchWorkersFromDB } from './workers/database'
// Import the syncWorkers function directly
import { useWorkerRegistry } from './workers/registry/store'
import { useSubBlockStore } from './workers/subblock/store'
import { useWorkerStore } from './workers/worker/store'

const logger = createLogger('Stores')

// Track initialization state
let isInitializing = false
let appFullyInitialized = false
let dataInitialized = false // Flag for actual data loading completion

/**
 * Initialize the application state and sync system
 * localStorage persistence has been removed - relies on DB and Zustand stores only
 */
async function initializeApplication(): Promise<void> {
  if (typeof window === 'undefined' || isInitializing) return

  isInitializing = true
  appFullyInitialized = false

  // Track initialization start time
  const initStartTime = Date.now()

  try {
    // Load environment variables directly from DB
    await useEnvironmentStore.getState().loadEnvironmentVariables()

    // Load custom tools from server
    await useCustomToolsStore.getState().loadCustomTools()

    // Extract worker ID from URL for smart workspace selection
    const workerIdFromUrl = extractWorkerIdFromUrl()

    // Load workspace based on worker ID in URL, with fallback to last active workspace
    await useWorkerRegistry.getState().loadWorkspaceFromWorkerId(workerIdFromUrl)

    // Initialize sync system and wait for data to load completely
    await fetchWorkersFromDB()

    // Data loaded successfully from database

    // Mark data as initialized only after sync managers have loaded data from DB
    dataInitialized = true

    // Register cleanup
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Log initialization timing information
    const initDuration = Date.now() - initStartTime
    logger.info(`Application initialization completed in ${initDuration}ms`)

    // Mark application as fully initialized
    appFullyInitialized = true
  } catch (error) {
    logger.error('Error during application initialization:', { error })
    // Still mark as initialized to prevent being stuck in initializing state
    appFullyInitialized = true
    // But don't mark data as initialized on error
    dataInitialized = false
  } finally {
    isInitializing = false
  }
}

/**
 * Extract worker ID from current URL
 * @returns worker ID if found in URL, null otherwise
 */
function extractWorkerIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null

  try {
    const pathSegments = window.location.pathname.split('/')
    // Check if URL matches pattern /workspace/{workerId}
    if (pathSegments.length >= 3 && pathSegments[1] === 'w') {
      const workerId = pathSegments[2]
      // Basic UUID validation (36 characters, contains hyphens)
      if (workerId && workerId.length === 36 && workerId.includes('-')) {
        logger.info(`Extracted worker ID from URL: ${workerId}`)
        return workerId
      }
    }
    return null
  } catch (error) {
    logger.warn('Failed to extract worker ID from URL:', error)
    return null
  }
}

/**
 * Checks if application is fully initialized
 */
export function isAppInitialized(): boolean {
  return appFullyInitialized
}

/**
 * Checks if data has been loaded from the database
 * This should be checked before any sync operations
 */
export function isDataInitialized(): boolean {
  return dataInitialized
}

/**
 * Handle application cleanup before unload
 */
function handleBeforeUnload(event: BeforeUnloadEvent): void {
  // Check if we're on an authentication page and skip confirmation if we are
  if (typeof window !== 'undefined') {
    const path = window.location.pathname
    // Skip confirmation for auth-related pages
    if (
      path === 'auth/sign-in' ||
      path === 'auth/sign-up' ||
      path === 'auth/forgot-password' ||
      path === 'auth/verify'
    ) {
      return
    }
  }

  // Standard beforeunload pattern
  event.preventDefault()
  event.returnValue = ''
}

/**
 * Clean up sync system
 */
function cleanupApplication(): void {
  window.removeEventListener('beforeunload', handleBeforeUnload)
}

/**
 * Clear all user data when signing out
 * localStorage persistence has been removed
 */
export async function clearUserData(): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    // Reset all stores to their initial state
    resetAllStores()

    // Clear localStorage except for essential app settings (minimal usage)
    const keysToKeep = ['next-favicon', 'theme']
    const keysToRemove = Object.keys(localStorage).filter((key) => !keysToKeep.includes(key))
    keysToRemove.forEach((key) => localStorage.removeItem(key))

    // Reset application initialization state
    appFullyInitialized = false
    dataInitialized = false

    logger.info('User data cleared successfully')
  } catch (error) {
    logger.error('Error clearing user data:', { error })
  }
}

/**
 * Hook to manage application lifecycle
 */
export function useAppInitialization() {
  useEffect(() => {
    // Use Promise to handle async initialization
    initializeApplication()

    return () => {
      cleanupApplication()
    }
  }, [])
}

/**
 * Hook to reinitialize the application after successful login
 * Use this in the login success handler or post-login page
 */
export function useLoginInitialization() {
  useEffect(() => {
    reinitializeAfterLogin()
  }, [])
}

/**
 * Reinitialize the application after login
 * This ensures we load fresh data from the database for the new user
 */
export async function reinitializeAfterLogin(): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    // Reset application initialization state
    appFullyInitialized = false
    dataInitialized = false

    // Clean existing state to avoid stale data
    resetAllStores()

    // Reset initialization flags to force a fresh load
    isInitializing = false

    // Reinitialize the application
    await initializeApplication()

    logger.info('Application reinitialized after login')
  } catch (error) {
    logger.error('Error reinitializing application:', { error })
  }
}

// Initialize immediately when imported on client
if (typeof window !== 'undefined') {
  initializeApplication()
}

// Export all stores
export {
  useWorkerStore,
  useWorkerRegistry,
  useNotificationStore,
  useEnvironmentStore,
  useExecutionStore,
  useConsoleStore,
  useCopilotStore,
  useCustomToolsStore,
  useVariablesStore,
  useSubBlockStore,
}

// Helper function to reset all stores
export const resetAllStores = () => {
  // Reset all stores to initial state
  useWorkerRegistry.setState({
    workers: {},
    activeWorkerId: null,
    isLoading: false,
    error: null,
  })
  useWorkerStore.getState().clear()
  // Clean up realtime subscriptions
  const workerStore = useWorkerStore.getState()
  if (workerStore.cleanupRealtime) {
    workerStore.cleanupRealtime()
  }
  useSubBlockStore.getState().clear()
  useSubBlockStore.getState().clearToolParams()
  useNotificationStore.setState({ notifications: [] })
  useEnvironmentStore.setState({
    variables: {},
    isLoading: false,
    error: null,
  })
  useExecutionStore.getState().reset()
  useConsoleStore.setState({ entries: [], isOpen: false })
  useCopilotStore.setState({ messages: [], isProcessing: false, error: null })
  useCustomToolsStore.setState({ tools: {} })
  useVariablesStore.getState().resetLoaded() // Reset variables store tracking
}

// Helper function to log all store states
export const logAllStores = () => {
  const state = {
    worker: useWorkerStore.getState(),
    workerRegistry: useWorkerRegistry.getState(),
    notifications: useNotificationStore.getState(),
    environment: useEnvironmentStore.getState(),
    execution: useExecutionStore.getState(),
    console: useConsoleStore.getState(),
    copilot: useCopilotStore.getState(),
    customTools: useCustomToolsStore.getState(),
    subBlock: useSubBlockStore.getState(),
    variables: useVariablesStore.getState(),
  }

  return state
}
