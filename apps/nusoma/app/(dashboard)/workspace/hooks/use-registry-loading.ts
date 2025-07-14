'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createLogger } from '@/lib/logger/console-logger'
import { useWorkerRegistry } from '@/stores/workers/registry/store'

const logger = createLogger('UseRegistryLoading')

/**
 * Extract worker ID from pathname
 * @param pathname - Current pathname
 * @returns worker ID if found, null otherwise
 */
function extractWorkerIdFromPathname(pathname: string): string | null {
  try {
    const pathSegments = pathname.split('/')
    // Check if URL matches pattern /worker/{workerId}
    if (pathSegments.length >= 3 && pathSegments[1] === 'w') {
      const workerId = pathSegments[2]
      // Basic UUID validation (36 characters, contains hyphens)
      if (workerId && workerId.length === 36 && workerId.includes('-')) {
        return workerId
      }
    }
    return null
  } catch (error) {
    logger.warn('Failed to extract worker ID from pathname:', error)
    return null
  }
}

/**
 * Custom hook to manage worker registry loading state and handle first-time navigation
 *
 * This hook initializes the loading state and automatically clears it
 * when workers are loaded. It also handles smart workspace selection
 * and navigation for first-time users.
 */
export function useRegistryLoading() {
  const { workers, setLoading, isLoading, activeWorkspaceId, loadWorkspaceFromWorkerId } =
    useWorkerRegistry()
  const pathname = usePathname()
  const router = useRouter()

  // Handle workspace selection from URL
  useEffect(() => {
    if (!activeWorkspaceId) {
      const workerIdFromUrl = extractWorkerIdFromPathname(pathname)
      if (workerIdFromUrl) {
        loadWorkspaceFromWorkerId(workerIdFromUrl).catch((error) => {
          logger.warn('Failed to load workspace from worker ID:', error)
        })
      }
    }
  }, [activeWorkspaceId, pathname, loadWorkspaceFromWorkerId])

  // Handle first-time navigation: if we're at /w and have workers, navigate to first one
  useEffect(() => {
    if (!isLoading && activeWorkspaceId && Object.keys(workers).length > 0) {
      const workerCount = Object.keys(workers).length
      const currentWorkerId = extractWorkerIdFromPathname(pathname)

      // If we're at a generic workspace URL (/w, /worker/, or /worker/workspaceId) without a specific worker
      if (
        !currentWorkerId &&
        (pathname === '/w' ||
          pathname === '/worker/' ||
          pathname === `/worker/${activeWorkspaceId}`)
      ) {
        const firstWorkerId = Object.keys(workers)[0]
        logger.info('First-time navigation: redirecting to first worker:', firstWorkerId)
        router.replace(`/worker/${firstWorkerId}`)
      }
    }
  }, [isLoading, activeWorkspaceId, workers, pathname, router])

  // Handle loading states
  useEffect(() => {
    // Only set loading if we don't have workers and aren't already loading
    if (Object.keys(workers).length === 0 && !isLoading) {
      setLoading(true)
    }

    // If workers are already loaded, clear loading state
    if (Object.keys(workers).length > 0 && isLoading) {
      setTimeout(() => setLoading(false), 100)
      return
    }

    // Only create timeout if we're actually loading
    if (!isLoading) return

    // Create a timeout to clear loading state after max time
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 3000) // 3 second maximum loading time

    // Listen for workers to be loaded
    const checkInterval = setInterval(() => {
      const currentWorkers = useWorkerRegistry.getState().workers
      if (Object.keys(currentWorkers).length > 0) {
        setLoading(false)
        clearInterval(checkInterval)
      }
    }, 200)

    return () => {
      clearTimeout(timeout)
      clearInterval(checkInterval)
    }
  }, [setLoading, workers, isLoading])
}
