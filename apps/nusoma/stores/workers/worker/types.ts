import type { Edge } from '@xyflow/react'
import type { BlockOutput, SubBlockType } from '@/blocks/types'
import type { DeploymentStatus } from '../registry/types'

// Centralized subflow type system - easy to extend without database changes
export const SUBFLOW_TYPES = {
  LOOP: 'loop',
  PARALLEL: 'parallel',
  // Future types can be added here:
  // CONDITIONAL: 'conditional',
  // RETRY: 'retry',
  // BATCH: 'batch',
} as const

export type SubflowType = (typeof SUBFLOW_TYPES)[keyof typeof SUBFLOW_TYPES]

// Type guard for runtime validation
export function isValidSubflowType(type: string): type is SubflowType {
  return Object.values(SUBFLOW_TYPES).includes(type as SubflowType)
}

// Subflow configuration interfaces
export interface LoopConfig {
  nodes: string[]
  iterations: number
  loopType: 'for' | 'forEach'
  forEachItems?: any[] | Record<string, any> | string
}

export interface ParallelConfig {
  nodes: string[]
  distribution?: any[] | Record<string, any> | string
  parallelType?: 'count' | 'collection'
}

// Generic subflow interface
export interface Subflow {
  id: string
  workerId: string
  type: SubflowType
  config: LoopConfig | ParallelConfig
  createdAt: Date
  updatedAt: Date
}

export interface Position {
  x: number
  y: number
}

export interface BlockData {
  // Parent-child relationships for container nodes
  parentId?: string
  extent?: 'parent'

  // Container dimensions
  width?: number
  height?: number

  // Loop-specific properties
  collection?: any // The items to iterate over in a loop
  count?: number // Number of iterations for numeric loops
  loopType?: 'for' | 'forEach' // Type of loop - must match Loop interface

  // Parallel-specific properties
  parallelType?: 'collection' | 'count' // Type of parallel execution

  // Container node type (for ReactFlow node type determination)
  type?: string
}

export interface BlockState {
  id: string
  type: string
  name: string
  position: Position
  subBlocks: Record<string, SubBlockState>
  outputs: Record<string, BlockOutput>
  enabled: boolean
  horizontalHandles?: boolean
  isWide?: boolean
  height?: number
  advancedMode?: boolean
  data?: BlockData
}

export interface SubBlockState {
  id: string
  type: SubBlockType
  value: string | number | string[][] | null
}

export interface LoopBlock {
  id: string
  loopType: 'for' | 'forEach'
  count: number
  collection: string
  width: number
  height: number
  executionState: {
    currentIteration: number
    isExecuting: boolean
    startTime: null | number
    endTime: null | number
  }
}

export interface ParallelBlock {
  id: string
  collection: string
  width: number
  height: number
  executionState: {
    currentExecution: number
    isExecuting: boolean
    startTime: null | number
    endTime: null | number
  }
}

export interface Loop {
  id: string
  nodes: string[]
  iterations: number
  loopType: 'for' | 'forEach'
  forEachItems?: any[] | Record<string, any> | string // Items or expression
}

export interface Parallel {
  id: string
  nodes: string[]
  distribution?: any[] | Record<string, any> | string // Items or expression
}

export interface WorkerState {
  blocks: Record<string, BlockState>
  edges: Edge[]
  lastSaved?: number
  loops: Record<string, Loop>
  parallels: Record<string, Parallel>
  lastUpdate?: number
  // Legacy deployment fields (keeping for compatibility)
  isDeployed?: boolean
  deployedAt?: Date
  isPublished?: boolean
  // New field for per-worker deployment status
  deploymentStatuses?: Record<string, DeploymentStatus>
  needsRedeployment?: boolean
  hasActiveSchedule?: boolean
  hasActiveWebhook?: boolean
  cursors: Record<string, any>
}

export interface WorkerActions {
  addBlock: (
    id: string,
    type: string,
    name: string,
    position: Position,
    data?: Record<string, any>,
    parentId?: string,
    extent?: 'parent'
  ) => void
  updateBlockPosition: (id: string, position: Position) => void
  updateNodeDimensions: (id: string, dimensions: { width: number; height: number }) => void
  updateParentId: (id: string, parentId: string, extent: 'parent') => void
  removeBlock: (id: string) => void
  addEdge: (edge: Edge) => void
  removeEdge: (edgeId: string) => void
  clear: () => Partial<WorkerState>
  updateLastSaved: () => void
  toggleBlockEnabled: (id: string) => void
  duplicateBlock: (id: string) => void
  toggleBlockHandles: (id: string) => void
  updateBlockName: (id: string, name: string) => void
  toggleBlockWide: (id: string) => void
  updateBlockHeight: (id: string, height: number) => void
  triggerUpdate: () => void
  updateLoopCount: (loopId: string, count: number) => void
  updateLoopType: (loopId: string, loopType: 'for' | 'forEach') => void
  updateLoopCollection: (loopId: string, collection: string) => void
  updateParallelCount: (parallelId: string, count: number) => void
  updateParallelCollection: (parallelId: string, collection: string) => void
  generateLoopBlocks: () => Record<string, Loop>
  generateParallelBlocks: () => Record<string, Parallel>
  setNeedsRedeploymentFlag: (needsRedeployment: boolean) => void
  setScheduleStatus: (hasActiveSchedule: boolean) => void
  setWebhookStatus: (hasActiveWebhook: boolean) => void
  revertToDeployedState: (deployedState: WorkerState) => void
  toggleBlockAdvancedMode: (id: string) => void
  updateSubBlockValue: (blockId: string, subBlockId: string, value: any) => void
}

export type WorkerStore = WorkerState & WorkerActions
