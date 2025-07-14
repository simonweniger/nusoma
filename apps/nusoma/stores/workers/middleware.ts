import { useSubBlockStore } from './subblock/store'
import type { WorkerState } from './worker/types'

// Maximum number of history entries for a single worker
const MAX_HISTORY_LENGTH = 50

// Describes a single entry in the history stack
export interface HistoryEntry {
  state: Partial<WorkerState>
  timestamp: number
  action: string
  subblockValues: Record<string, any>
}

// Describes the structure of the history object in the store
export interface History {
  past: HistoryEntry[]
  present: HistoryEntry
  future: HistoryEntry[]
}

// Defines the actions available for manipulating the history
export interface HistoryActions {
  undo: () => void
  redo: () => void
  clearHistory: () => void
  pushHistory: (action: string) => void
  revertToHistoryState: (index: number) => void
  canUndo: () => boolean
  canRedo: () => boolean
}

/**
 * Creates a new history entry.
 * It captures a snapshot of the current worker state and sub-block values.
 * @param state - The current state of the worker.
 * @param action - A description of the action that led to this state change.
 * @returns A new history entry object.
 */
export function createHistoryEntry(
  state: Partial<WorkerState>,
  action: string,
  activeWorkerId: string | null
): HistoryEntry {
  const subblockValues = activeWorkerId
    ? useSubBlockStore.getState().workerValues[activeWorkerId] || {}
    : {}

  // We only store a partial state to keep the history lightweight
  const stateSnapshot: Partial<WorkerState> = {
    blocks: state.blocks,
    edges: state.edges,
    loops: state.loops,
    parallels: state.parallels,
  }

  return {
    state: stateSnapshot,
    timestamp: Date.now(),
    action,
    subblockValues: JSON.parse(JSON.stringify(subblockValues)), // Deep copy
  }
}
