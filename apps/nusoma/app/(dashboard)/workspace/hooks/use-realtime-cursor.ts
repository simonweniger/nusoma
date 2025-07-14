import { useCallback, useEffect, useRef } from 'react'
import { useWorkerStore } from '@/stores/workers/worker/store'

/**
 * Throttle a callback to a certain delay, It will only call the callback if the delay has passed, with the arguments
 * from the last call
 */
const useThrottleCallback = <Params extends unknown[], Return>(
  callback: (...args: Params) => Return,
  delay: number
) => {
  const lastCall = useRef(0)
  const timeout = useRef<NodeJS.Timeout | null>(null)

  return useCallback(
    (...args: Params) => {
      const now = Date.now()
      const remainingTime = delay - (now - lastCall.current)

      if (remainingTime <= 0) {
        if (timeout.current) {
          clearTimeout(timeout.current)
          timeout.current = null
        }
        lastCall.current = now
        callback(...args)
      } else if (!timeout.current) {
        timeout.current = setTimeout(() => {
          lastCall.current = Date.now()
          timeout.current = null
          callback(...args)
        }, remainingTime)
      }
    },
    [callback, delay]
  )
}

export const useRealtimeCursor = ({ throttleMs }: { throttleMs: number }) => {
  const cursors = useWorkerStore((state) => state.cursors)
  const updatePresence = useWorkerStore((state) => state.updatePresence)

  const handleMouseMove = useThrottleCallback((event: MouseEvent) => {
    updatePresence({ cursor: { x: event.clientX, y: event.clientY } })
  }, throttleMs)

  useEffect(() => {
    const handleMouseLeave = () => {
      updatePresence({ cursor: undefined })
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [handleMouseMove, updatePresence])

  return { cursors }
}
