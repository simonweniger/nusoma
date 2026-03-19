import { useEffect } from 'react'
import { usePmStore } from '../stores/pmStore'

export function usePmEvents() {
  useEffect(() => {
    const unsub = window.nusoma.pm.onSyncProgress((progress) => {
      usePmStore.getState().setSyncProgress(progress)
    })
    return unsub
  }, [])
}
