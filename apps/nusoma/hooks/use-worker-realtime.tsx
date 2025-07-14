import { useEffect, useMemo, useRef } from 'react'
import { useSession } from '@/lib/auth-client'
import { useWorkerStore } from '@/stores/workers/worker/store'

/**
 * Hook to manage Supabase Realtime subscriptions for a worker.
 * This has been simplified to prevent subscription conflicts.
 */
export const useWorkerRealtime = (activeWorkerId: string | null) => {
  const { data: sessionData } = useSession()

  // Track the current worker ID to prevent unnecessary re-subscriptions
  const currentWorkerIdRef = useRef<string | null>(null)

  // Select functions from the store. These are stable and won't cause re-renders.
  const initializeRealtime = useWorkerStore((state) => state.initializeRealtime)
  const cleanupRealtime = useWorkerStore((state) => state.cleanupRealtime)
  const updatePresence = useWorkerStore((state) => state.updatePresence)
  const isSubscribed = useWorkerStore((state) => state._isSubscribed)

  // Memoize the session data to create a stable dependency for the effect hook.
  const stableSession = useMemo(
    () =>
      sessionData
        ? JSON.stringify({
            user: sessionData.user
              ? {
                  id: sessionData.user.id,
                  email: sessionData.user.email,
                  name: sessionData.user.name,
                }
              : null,
          })
        : null,
    [sessionData]
  )

  // Effect to manage the real-time connection lifecycle.
  useEffect(() => {
    // Only initialize if we have a worker ID and a valid session.
    if (!activeWorkerId || !sessionData) {
      // Clean up if we don't have the required data
      if (currentWorkerIdRef.current) {
        console.log('Cleaning up realtime - missing worker ID or session')
        cleanupRealtime()
        currentWorkerIdRef.current = null
      }
      return
    }

    // If we're switching workers, clean up first
    if (currentWorkerIdRef.current && currentWorkerIdRef.current !== activeWorkerId) {
      console.log(`Switching from worker ${currentWorkerIdRef.current} to ${activeWorkerId}`)
      cleanupRealtime()
    }

    // Update current worker reference
    currentWorkerIdRef.current = activeWorkerId

    // Initialize for the worker
    console.log(`Hook: Initializing realtime for worker: ${activeWorkerId}`)
    initializeRealtime(activeWorkerId, sessionData)
      .then(() => {
        console.log(`Hook: Successfully initialized realtime for worker: ${activeWorkerId}`)
      })
      .catch((error) => {
        console.error(`Hook: Failed to initialize realtime for worker ${activeWorkerId}:`, error)
        currentWorkerIdRef.current = null
      })

    // Cleanup runs when the component unmounts or the worker/session changes.
    return () => {
      console.log('useWorkerRealtime cleanup')
      cleanupRealtime()
      currentWorkerIdRef.current = null
    }
    // Depend on the stable session string to prevent unnecessary re-runs.
  }, [activeWorkerId, stableSession, initializeRealtime, cleanupRealtime])

  // Effect to handle sending the user's cursor position.
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (isSubscribed && activeWorkerId) {
        updatePresence({ cursor: { x: event.clientX, y: event.clientY } })
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [updatePresence, isSubscribed, activeWorkerId]) // Depends only on the stable updatePresence function.
}
