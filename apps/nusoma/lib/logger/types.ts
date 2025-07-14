import type { Edge } from '@xyflow/react'
import type { BlockLog, NormalizedBlockOutput } from '@/executor/types'
import type { DeploymentStatus } from '@/stores/workers/registry/types'
import type { Loop, Parallel, WorkerState } from '@/stores/workers/worker/types'

export type { WorkerState, Loop, Parallel, DeploymentStatus }
export type WorkerEdge = Edge
export type { NormalizedBlockOutput, BlockLog }

export interface PricingInfo {
  input: number
  output: number
  cachedInput?: number
  updatedAt: string
}

export interface TokenUsage {
  prompt: number
  completion: number
  total: number
}

export interface CostBreakdown {
  input: number
  output: number
  total: number
  tokens: TokenUsage
  model: string
  pricing: PricingInfo
}

export interface ToolCall {
  name: string
  duration: number
  startTime: string
  endTime: string
  status: 'success' | 'error'
  input: Record<string, unknown>
  output: Record<string, unknown>
  error?: string
}

export type BlockInputData = Record<string, any>
export type BlockOutputData = NormalizedBlockOutput | null

export interface ExecutionEnvironment {
  variables: Record<string, string>
  workerId: string
  executionId: string
  userId: string
  workspaceId: string
}

export interface ExecutionTrigger {
  type: 'api' | 'webhook' | 'schedule' | 'manual' | 'chat'
  source: string
  data?: Record<string, unknown>
  timestamp: string
}

export interface ExecutionStatus {
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  startedAt: string
  endedAt?: string
  durationMs?: number
}

export interface WorkerExecutionSnapshot {
  id: string
  workerId: string
  stateHash: string
  stateData: WorkerState
  createdAt: string
}

export type WorkerExecutionSnapshotInsert = Omit<WorkerExecutionSnapshot, 'createdAt'>
export type WorkerExecutionSnapshotSelect = WorkerExecutionSnapshot

export interface WorkerExecutionLog {
  id: string
  workerId: string
  executionId: string
  stateSnapshotId: string
  level: 'info' | 'error'
  message: string
  trigger: ExecutionTrigger['type']
  startedAt: string
  endedAt: string
  totalDurationMs: number
  blockCount: number
  successCount: number
  errorCount: number
  skippedCount: number
  totalCost: number
  totalInputCost: number
  totalOutputCost: number
  totalTokens: number
  primaryModel: string
  metadata: {
    environment: ExecutionEnvironment
    trigger: ExecutionTrigger
    traceSpans?: TraceSpan[]
    errorDetails?: {
      blockId: string
      blockName: string
      error: string
      stackTrace?: string
    }
  }
  duration?: string
  createdAt: string
}

export type WorkerExecutionLogInsert = Omit<WorkerExecutionLog, 'id' | 'createdAt'>
export type WorkerExecutionLogSelect = WorkerExecutionLog

export interface BlockExecutionLog {
  id: string
  executionId: string
  workerId: string
  blockId: string
  blockName: string
  blockType: string
  startedAt: string
  endedAt: string
  durationMs: number
  status: 'success' | 'error' | 'skipped'
  errorMessage?: string
  errorStackTrace?: string
  inputData: BlockInputData
  outputData: BlockOutputData
  cost: CostBreakdown | null
  metadata: {
    toolCalls?: ToolCall[]
    iterationIndex?: number
    virtualBlockId?: string
    parentBlockId?: string
    environmentSnapshot?: Record<string, string>
  }
  createdAt: string
}

export type BlockExecutionLogInsert = Omit<BlockExecutionLog, 'id' | 'createdAt'>
export type BlockExecutionLogSelect = BlockExecutionLog

export interface TraceSpan {
  id: string
  name: string
  type: string
  duration: number
  startTime: string
  endTime: string
  children?: TraceSpan[]
  toolCalls?: ToolCall[]
  status?: 'success' | 'error'
  tokens?: number
  relativeStartMs?: number
  blockId?: string
  input?: Record<string, unknown>
}

export interface WorkerExecutionSummary {
  id: string
  workerId: string
  workerName: string
  executionId: string
  trigger: ExecutionTrigger['type']
  status: ExecutionStatus['status']
  startedAt: string
  endedAt: string
  durationMs: number
  blockStats: {
    total: number
    success: number
    error: number
    skipped: number
  }
  costSummary: {
    total: number
    inputCost: number
    outputCost: number
    tokens: number
    primaryModel: string
  }
  stateSnapshotId: string
  errorSummary?: {
    blockId: string
    blockName: string
    message: string
  }
}

export interface WorkerExecutionDetail extends WorkerExecutionSummary {
  environment: ExecutionEnvironment
  triggerData: ExecutionTrigger
  blockExecutions: BlockExecutionSummary[]
  traceSpans: TraceSpan[]
  workerState: WorkerState
}

export interface BlockExecutionSummary {
  id: string
  blockId: string
  blockName: string
  blockType: string
  startedAt: string
  endedAt: string
  durationMs: number
  status: BlockExecutionLog['status']
  errorMessage?: string
  cost?: CostBreakdown
  inputSummary: {
    parameterCount: number
    hasComplexData: boolean
  }
  outputSummary: {
    hasOutput: boolean
    outputType: string
    hasError: boolean
  }
}

export interface BlockExecutionDetail extends BlockExecutionSummary {
  inputData: BlockInputData
  outputData: BlockOutputData
  metadata: BlockExecutionLog['metadata']
  toolCalls?: ToolCall[]
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrevious: boolean
  }
}

export type WorkerExecutionsResponse = PaginatedResponse<WorkerExecutionSummary>
export type BlockExecutionsResponse = PaginatedResponse<BlockExecutionSummary>

export interface WorkerExecutionFilters {
  workerIds?: string[]
  folderIds?: string[]
  triggers?: ExecutionTrigger['type'][]
  status?: ExecutionStatus['status'][]
  startDate?: string
  endDate?: string
  search?: string
  minDuration?: number
  maxDuration?: number
  minCost?: number
  maxCost?: number
  hasErrors?: boolean
}

export interface PaginationParams {
  page: number
  pageSize: number
  sortBy?: 'startedAt' | 'durationMs' | 'totalCost' | 'blockCount'
  sortOrder?: 'asc' | 'desc'
}

export interface LogsQueryParams extends WorkerExecutionFilters, PaginationParams {
  includeBlockSummary?: boolean
  includeWorkerState?: boolean
}

export interface LogsError {
  code: 'EXECUTION_NOT_FOUND' | 'SNAPSHOT_NOT_FOUND' | 'INVALID_WORKFLOW_STATE' | 'STORAGE_ERROR'
  message: string
  details?: Record<string, unknown>
}

export interface ValidationError {
  field: string
  message: string
  value: unknown
}

export class LogsServiceError extends Error {
  public code: LogsError['code']
  public details?: Record<string, unknown>

  constructor(message: string, code: LogsError['code'], details?: Record<string, unknown>) {
    super(message)
    this.name = 'LogsServiceError'
    this.code = code
    this.details = details
  }
}

export interface DatabaseOperationResult<T> {
  success: boolean
  data?: T
  error?: LogsServiceError
}

export interface BatchInsertResult<T> {
  inserted: T[]
  failed: Array<{
    item: T
    error: string
  }>
  totalAttempted: number
  totalSucceeded: number
  totalFailed: number
}

export interface SnapshotService {
  createSnapshot(workerId: string, state: WorkerState): Promise<WorkerExecutionSnapshot>
  getSnapshot(id: string): Promise<WorkerExecutionSnapshot | null>
  getSnapshotByHash(workerId: string, hash: string): Promise<WorkerExecutionSnapshot | null>
  computeStateHash(state: WorkerState): string
  cleanupOrphanedSnapshots(olderThanDays: number): Promise<number>
}

export interface SnapshotCreationResult {
  snapshot: WorkerExecutionSnapshot
  isNew: boolean
}

export interface ExecutionLoggerService {
  startWorkerExecution(params: {
    workerId: string
    executionId: string
    trigger: ExecutionTrigger
    environment: ExecutionEnvironment
    workerState: WorkerState
  }): Promise<{
    workerLog: WorkerExecutionLog
    snapshot: WorkerExecutionSnapshot
  }>

  logBlockExecution(params: {
    executionId: string
    workerId: string
    blockId: string
    blockName: string
    blockType: string
    input: BlockInputData
    output: BlockOutputData
    timing: {
      startedAt: string
      endedAt: string
      durationMs: number
    }
    status: BlockExecutionLog['status']
    error?: {
      message: string
      stackTrace?: string
    }
    cost?: CostBreakdown
    metadata?: BlockExecutionLog['metadata']
  }): Promise<BlockExecutionLog>

  completeWorkerExecution(params: {
    executionId: string
    endedAt: string
    totalDurationMs: number
    blockStats: {
      total: number
      success: number
      error: number
      skipped: number
    }
    costSummary: {
      totalCost: number
      totalInputCost: number
      totalOutputCost: number
      totalTokens: number
      primaryModel: string
    }
    finalOutput: BlockOutputData
    traceSpans?: TraceSpan[]
  }): Promise<WorkerExecutionLog>
}
