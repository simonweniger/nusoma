export interface MarketplaceData {
  id: string // Marketplace entry ID to track original marketplace source
  status: 'owner' | 'temp'
}

export interface DeploymentStatus {
  isDeployed: boolean
  deployedAt?: Date
  apiKey?: string
  needsRedeployment?: boolean
}

export interface WorkerMetadata {
  id: string
  name: string
  lastModified: Date
  description?: string
  color: string
  marketplaceData?: MarketplaceData | null
  workspaceId?: string
  folderId?: string | null
  blocks: Record<string, any>
}

export interface WorkerRegistryState {
  workers: Record<string, WorkerMetadata>
  activeWorkerId: string | null
  activeWorkspaceId: string | null
  isLoading: boolean
  error: string | null
  deploymentStatuses: Record<string, DeploymentStatus>
}

export interface WorkerRegistryActions {
  setLoading: (loading: boolean) => void
  setActiveWorker: (id: string) => Promise<void>
  switchToWorkspace: (id: string) => void
  setActiveWorkspaceId: (id: string) => void
  loadLastActiveWorkspace: () => Promise<void>
  loadWorkspaceFromWorkerId: (workerId: string | null) => Promise<void>
  handleWorkspaceDeletion: (newWorkspaceId: string) => void
  removeWorker: (id: string) => Promise<void>
  updateWorker: (id: string, metadata: Partial<WorkerMetadata>) => void
  createWorker: (options?: {
    isInitial?: boolean
    marketplaceId?: string
    marketplaceState?: any
    name?: string
    description?: string
    workspaceId?: string
    folderId?: string | null
  }) => string
  createMarketplaceWorker: (
    marketplaceId: string,
    state: any,
    metadata: Partial<WorkerMetadata>
  ) => string
  duplicateWorker: (sourceId: string) => string | null
  getWorkerDeploymentStatus: (workerId: string | null) => DeploymentStatus | null
  setDeploymentStatus: (
    workerId: string | null,
    isDeployed: boolean,
    deployedAt?: Date,
    apiKey?: string
  ) => void
  setWorkerNeedsRedeployment: (workerId: string | null, needsRedeployment: boolean) => void
}

export type WorkerRegistry = WorkerRegistryState & WorkerRegistryActions
