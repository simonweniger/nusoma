import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { createLogger } from '@/lib/logger/console-logger'
import { useWorkerRegistry } from '../workers/registry/store'

const logger = createLogger('FoldersStore')

export interface Worker {
  id: string
  folderId?: string | null
  name?: string
  description?: string
  userId?: string
  workspaceId?: string
  [key: string]: any
}

export interface WorkerFolder {
  id: string
  name: string
  userId: string
  workspaceId: string
  parentId: string | null
  color: string
  isExpanded: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface FolderTreeNode extends WorkerFolder {
  children: FolderTreeNode[]
  level: number
}

interface FolderState {
  folders: Record<string, WorkerFolder>
  isLoading: boolean
  expandedFolders: Set<string>
  selectedWorkers: Set<string>

  // Actions
  setFolders: (folders: WorkerFolder[]) => void
  addFolder: (folder: WorkerFolder) => void
  updateFolder: (id: string, updates: Partial<WorkerFolder>) => void
  removeFolder: (id: string) => void
  setLoading: (loading: boolean) => void
  toggleExpanded: (folderId: string) => void
  setExpanded: (folderId: string, expanded: boolean) => void

  // Selection actions
  selectWorker: (workerId: string) => void
  deselectWorker: (workerId: string) => void
  toggleWorkerSelection: (workerId: string) => void
  clearSelection: () => void
  selectOnly: (workerId: string) => void
  isWorkerSelected: (workerId: string) => boolean

  // Computed values
  getFolderTree: (workspaceId: string) => FolderTreeNode[]
  getFolderById: (id: string) => WorkerFolder | undefined
  getChildFolders: (parentId: string | null) => WorkerFolder[]
  getFolderPath: (folderId: string) => WorkerFolder[]

  // API actions
  fetchFolders: (workspaceId: string) => Promise<void>
  createFolder: (data: {
    name: string
    workspaceId: string
    parentId?: string
    color?: string
  }) => Promise<WorkerFolder>
  updateFolderAPI: (id: string, updates: Partial<WorkerFolder>) => Promise<WorkerFolder>
  deleteFolder: (id: string) => Promise<void>

  // Helper functions
  isWorkerInDeletedSubfolder: (worker: Worker, deletedFolderId: string) => boolean
  removeSubfoldersRecursively: (parentFolderId: string) => void
}

export const useFolderStore = create<FolderState>()(
  devtools(
    (set, get) => ({
      folders: {},
      isLoading: false,
      expandedFolders: new Set(),
      selectedWorkers: new Set(),

      setFolders: (folders) =>
        set(() => ({
          folders: folders.reduce(
            (acc, folder) => {
              acc[folder.id] = folder
              return acc
            },
            {} as Record<string, WorkerFolder>
          ),
        })),

      addFolder: (folder) =>
        set((state) => ({
          folders: { ...state.folders, [folder.id]: folder },
        })),

      updateFolder: (id, updates) =>
        set((state) => ({
          folders: {
            ...state.folders,
            [id]: state.folders[id] ? { ...state.folders[id], ...updates } : state.folders[id],
          },
        })),

      removeFolder: (id) =>
        set((state) => {
          const newFolders = { ...state.folders }
          delete newFolders[id]
          return { folders: newFolders }
        }),

      setLoading: (loading) => set({ isLoading: loading }),

      toggleExpanded: (folderId) =>
        set((state) => {
          const newExpanded = new Set(state.expandedFolders)
          if (newExpanded.has(folderId)) {
            newExpanded.delete(folderId)
          } else {
            newExpanded.add(folderId)
          }
          return { expandedFolders: newExpanded }
        }),

      setExpanded: (folderId, expanded) =>
        set((state) => {
          const newExpanded = new Set(state.expandedFolders)
          if (expanded) {
            newExpanded.add(folderId)
          } else {
            newExpanded.delete(folderId)
          }
          return { expandedFolders: newExpanded }
        }),

      // Selection actions
      selectWorker: (workerId) =>
        set((state) => {
          const newSelected = new Set(state.selectedWorkers)
          newSelected.add(workerId)
          return { selectedWorkers: newSelected }
        }),

      deselectWorker: (workerId) =>
        set((state) => {
          const newSelected = new Set(state.selectedWorkers)
          newSelected.delete(workerId)
          return { selectedWorkers: newSelected }
        }),

      toggleWorkerSelection: (workerId) =>
        set((state) => {
          const newSelected = new Set(state.selectedWorkers)
          if (newSelected.has(workerId)) {
            newSelected.delete(workerId)
          } else {
            newSelected.add(workerId)
          }
          return { selectedWorkers: newSelected }
        }),

      clearSelection: () =>
        set(() => ({
          selectedWorkers: new Set(),
        })),

      selectOnly: (workerId) =>
        set(() => ({
          selectedWorkers: new Set([workerId]),
        })),

      isWorkerSelected: (workerId) => get().selectedWorkers.has(workerId),

      getFolderTree: (workspaceId) => {
        const folders = Object.values(get().folders).filter((f) => f.workspaceId === workspaceId)

        const buildTree = (parentId: string | null, level = 0): FolderTreeNode[] => {
          return folders
            .filter((folder) => folder.parentId === parentId)
            .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
            .map((folder) => ({
              ...folder,
              children: buildTree(folder.id, level + 1),
              level,
            }))
        }

        return buildTree(null)
      },

      getFolderById: (id) => get().folders[id],

      getChildFolders: (parentId) =>
        Object.values(get().folders)
          .filter((folder) => folder.parentId === parentId)
          .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),

      getFolderPath: (folderId) => {
        const folders = get().folders
        const path: WorkerFolder[] = []
        let currentId: string | null = folderId

        while (currentId && folders[currentId]) {
          const folder: WorkerFolder = folders[currentId]
          path.unshift(folder)
          currentId = folder.parentId
        }

        return path
      },

      fetchFolders: async (workspaceId) => {
        set({ isLoading: true })
        try {
          const response = await fetch(`/api/folders?workspaceId=${workspaceId}`)
          if (!response.ok) {
            throw new Error('Failed to fetch folders')
          }
          const { folders }: { folders: any[] } = await response.json()

          // Convert date strings to Date objects
          const processedFolders: WorkerFolder[] = folders.map((folder: any) => ({
            id: folder.id,
            name: folder.name,
            userId: folder.userId,
            workspaceId: folder.workspaceId,
            parentId: folder.parentId,
            color: folder.color,
            isExpanded: folder.isExpanded,
            sortOrder: folder.sortOrder,
            createdAt: new Date(folder.createdAt),
            updatedAt: new Date(folder.updatedAt),
          }))

          get().setFolders(processedFolders)

          // Initialize expanded state from folder data
          const expandedSet = new Set<string>()
          processedFolders.forEach((folder: WorkerFolder) => {
            if (folder.isExpanded) {
              expandedSet.add(folder.id)
            }
          })
          set({ expandedFolders: expandedSet })
        } catch (error) {
          logger.error('Error fetching folders:', error)
        } finally {
          set({ isLoading: false })
        }
      },

      createFolder: async (data) => {
        const response = await fetch('/api/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create folder')
        }

        const { folder } = await response.json()
        const processedFolder = {
          ...folder,
          createdAt: new Date(folder.createdAt),
          updatedAt: new Date(folder.updatedAt),
        }

        get().addFolder(processedFolder)
        return processedFolder
      },

      updateFolderAPI: async (id, updates) => {
        const response = await fetch(`/api/folders/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update folder')
        }

        const { folder } = await response.json()
        const processedFolder = {
          ...folder,
          createdAt: new Date(folder.createdAt),
          updatedAt: new Date(folder.updatedAt),
        }

        get().updateFolder(id, processedFolder)

        return processedFolder
      },

      deleteFolder: async (id: string) => {
        const response = await fetch(`/api/folders/${id}`, { method: 'DELETE' })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to delete folder')
        }

        const responseData = await response.json()

        get().removeFolder(id)

        // Remove from expanded state
        set((state) => {
          const newExpanded = new Set(state.expandedFolders)
          newExpanded.delete(id)
          return { expandedFolders: newExpanded }
        })

        const workerRegistry = useWorkerRegistry.getState()
        if (responseData.deletedItems) {
          try {
            const workers = Object.values(workerRegistry.workers)
            const workersToDelete = workers.filter(
              (worker) => worker.folderId === id || get().isWorkerInDeletedSubfolder(worker, id)
            )

            workersToDelete.forEach((worker) => {
              workerRegistry.removeWorker(worker.id)
            })

            get().removeSubfoldersRecursively(id)

            logger.info(
              `Deleted ${responseData.deletedItems.workers} worker(s) and ${responseData.deletedItems.folders} folder(s)`
            )
          } catch (error) {
            logger.error('Error updating local state after folder deletion:', error)
          }
        }
      },

      isWorkerInDeletedSubfolder: (worker: Worker, deletedFolderId: string) => {
        if (!worker.folderId) return false

        const folders = get().folders
        let currentFolderId: string | null = worker.folderId

        while (currentFolderId && folders[currentFolderId]) {
          if (currentFolderId === deletedFolderId) {
            return true
          }
          currentFolderId = folders[currentFolderId].parentId
        }

        return false
      },

      removeSubfoldersRecursively: (parentFolderId: string) => {
        const folders = get().folders
        const childFolderIds = Object.keys(folders).filter(
          (id) => folders[id].parentId === parentFolderId
        )

        childFolderIds.forEach((childId) => {
          get().removeSubfoldersRecursively(childId)
          get().removeFolder(childId)
        })
      },
    }),
    { name: 'folder-store' }
  )
)

// Selector hook for checking if a worker is selected (avoids get() calls)
export const useIsWorkerSelected = (workerId: string) =>
  useFolderStore((state) => state.selectedWorkers.has(workerId))
