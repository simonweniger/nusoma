import * as React from 'react'

export function useRunOnce<T>(callback: () => T | Promise<T>): void {
  const hasRun = React.useRef<boolean>(false)
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  React.useEffect(() => {
    if (hasRun.current) {
      return
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set a small timeout to ensure the component is mounted
    // Ensure timeout duration is always non-negative
    const timeoutDuration = Math.max(0, 1)
    timeoutRef.current = setTimeout(() => {
      hasRun.current = true
      callback()
    }, timeoutDuration)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])
}
