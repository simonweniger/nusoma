'use client'

import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { usePathname } from 'next/navigation'
import { type FolderTreeNode, useFolderStore } from '@/stores/folders/store'
import { useWorkerRegistry } from '@/stores/workers/registry/store'
import type { WorkerMetadata } from '@/stores/workers/registry/types'
import { FolderItem } from './components/folder-item'
import { WorkerItem } from './components/worker-item'

interface FolderSectionProps {
  folder: FolderTreeNode
  level: number
  isCollapsed: boolean
  onCreateWorker: (folderId?: string) => void
  workersByFolder: Record<string, WorkerMetadata[]>
  expandedFolders: Set<string>
  pathname: string
  updateWorker: (id: string, updates: Partial<WorkerMetadata>) => void
  renderFolderTree: (
    nodes: FolderTreeNode[],
    level: number,
    parentDragOver?: boolean
  ) => React.ReactNode[]
  parentDragOver?: boolean
}

function FolderSection({
  folder,
  level,
  isCollapsed,
  onCreateWorker,
  workersByFolder,
  expandedFolders,
  pathname,
  updateWorker,
  renderFolderTree,
  parentDragOver = false,
}: FolderSectionProps) {
  const { isDragOver, handleDragOver, handleDragLeave, handleDrop } = useDragHandlers(
    updateWorker,
    folder.id,
    `Moved worker(s) to folder ${folder.id}`
  )

  const workersInFolder = workersByFolder[folder.id] || []
  const isAnyDragOver = isDragOver || parentDragOver

  return (
    <div
      className={clsx(isDragOver ? 'rounded-md bg-blue-500/10 dark:bg-blue-400/10' : '')}
      style={
        isDragOver
          ? {
              boxShadow: 'inset 0 0 0 1px rgb(59 130 246 / 0.5)',
            }
          : {}
      }
    >
      {/* Render folder */}
      <div style={{ paddingLeft: isCollapsed ? '0px' : `${level * 20}px` }}>
        <FolderItem
          folder={folder}
          isCollapsed={isCollapsed}
          onCreateWorker={onCreateWorker}
          dragOver={isDragOver}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        />
      </div>

      {/* Render workers in this folder */}
      {expandedFolders.has(folder.id) && workersInFolder.length > 0 && (
        <div className='space-y-0.5'>
          {workersInFolder.map((worker) => (
            <WorkerItem
              key={worker.id}
              worker={worker}
              active={pathname === `/workspace/${worker.id}`}
              isCollapsed={isCollapsed}
              level={level}
              isDragOver={isAnyDragOver}
            />
          ))}
        </div>
      )}

      {/* Render child folders */}
      {expandedFolders.has(folder.id) && folder.children.length > 0 && (
        <div>{renderFolderTree(folder.children, level + 1, isAnyDragOver)}</div>
      )}
    </div>
  )
}

// Custom hook for drag and drop handling
function useDragHandlers(
  updateWorker: (id: string, updates: Partial<WorkerMetadata>) => void,
  targetFolderId: string | null, // null for root
  logMessage?: string
) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const workerIdsData = e.dataTransfer.getData('worker-ids')
    if (workerIdsData) {
      const workerIds = JSON.parse(workerIdsData) as string[]

      try {
        workerIds.forEach((workerId) => updateWorker(workerId, { folderId: targetFolderId }))
        console.log(logMessage || `Moved ${workerIds.length} worker(s)`)
      } catch (error) {
        console.error('Failed to move workers:', error)
      }
    }
  }

  return {
    isDragOver,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  }
}

interface FolderTreeProps {
  regularWorkers: WorkerMetadata[]
  marketplaceWorkers: WorkerMetadata[]
  isCollapsed?: boolean
  isLoading?: boolean
  onCreateWorker: (folderId?: string) => void
}

export function FolderTree({
  regularWorkers,
  marketplaceWorkers,
  isCollapsed = false,
  isLoading = false,
  onCreateWorker,
}: FolderTreeProps) {
  const pathname = usePathname()
  const { activeWorkspaceId } = useWorkerRegistry()
  const {
    getFolderTree,
    expandedFolders,
    fetchFolders,
    isLoading: foldersLoading,
    clearSelection,
  } = useFolderStore()
  const { updateWorker } = useWorkerRegistry()

  // Fetch folders when workspace changes
  useEffect(() => {
    if (activeWorkspaceId) {
      fetchFolders(activeWorkspaceId)
    }
  }, [activeWorkspaceId, fetchFolders])

  useEffect(() => {
    clearSelection()
  }, [activeWorkspaceId, clearSelection])

  const folderTree = activeWorkspaceId ? getFolderTree(activeWorkspaceId) : []

  // Group workers by folder
  const workersByFolder = regularWorkers.reduce(
    (acc, worker) => {
      const folderId = worker.folderId || 'root'
      if (!acc[folderId]) acc[folderId] = []
      acc[folderId].push(worker)
      return acc
    },
    {} as Record<string, WorkerMetadata[]>
  )

  const {
    isDragOver: rootDragOver,
    handleDragOver: handleRootDragOver,
    handleDragLeave: handleRootDragLeave,
    handleDrop: handleRootDrop,
  } = useDragHandlers(updateWorker, null, 'Moved worker(s) to root')

  const renderFolderTree = (
    nodes: FolderTreeNode[],
    level = 0,
    parentDragOver = false
  ): React.ReactNode[] => {
    return nodes.map((folder) => (
      <FolderSection
        key={folder.id}
        folder={folder}
        level={level}
        isCollapsed={isCollapsed}
        onCreateWorker={onCreateWorker}
        workersByFolder={workersByFolder}
        expandedFolders={expandedFolders}
        pathname={pathname}
        updateWorker={updateWorker}
        renderFolderTree={renderFolderTree}
        parentDragOver={parentDragOver}
      />
    ))
  }

  const showLoading = isLoading || foldersLoading

  return (
    <div
      className={`space-y-0.5 transition-opacity duration-200 ${showLoading ? 'opacity-60' : ''}`}
    >
      {/* Folder tree */}
      {renderFolderTree(folderTree)}

      {/* Root level workers (no folder) */}
      <div
        className={clsx(
          'space-y-0.5',
          rootDragOver ? 'rounded-md bg-blue-500/10 dark:bg-blue-400/10' : '',
          // Always provide minimal drop zone when root is empty, but keep it subtle
          (workersByFolder.root || []).length === 0 ? 'min-h-2 py-1' : ''
        )}
        style={
          rootDragOver
            ? {
                boxShadow: 'inset 0 0 0 1px rgb(59 130 246 / 0.5)',
              }
            : {}
        }
        onDragOver={handleRootDragOver}
        onDragLeave={handleRootDragLeave}
        onDrop={handleRootDrop}
      >
        {(workersByFolder.root || []).map((worker) => (
          <WorkerItem
            key={worker.id}
            worker={worker}
            active={pathname === `/workspace/${worker.id}`}
            isCollapsed={isCollapsed}
            level={-1}
            isDragOver={rootDragOver}
          />
        ))}
      </div>

      {/* Marketplace workers */}
      {marketplaceWorkers.length > 0 && (
        <div className='mt-2 border-border/30 border-t pt-2'>
          <h3
            className={`mb-1 px-2 font-medium text-muted-foreground text-xs ${
              isCollapsed ? 'text-center' : ''
            }`}
          >
            {isCollapsed ? '' : 'Marketplace'}
          </h3>
          {marketplaceWorkers.map((worker) => (
            <WorkerItem
              key={worker.id}
              worker={worker}
              active={pathname === `/workspace/${worker.id}`}
              isMarketplace
              isCollapsed={isCollapsed}
              level={-1}
              isDragOver={false}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!showLoading &&
        regularWorkers.length === 0 &&
        marketplaceWorkers.length === 0 &&
        folderTree.length === 0 &&
        !isCollapsed && (
          <div className='px-2 py-1.5 text-muted-foreground text-xs'>
            No workers or folders in {activeWorkspaceId ? 'this workspace' : 'your account'}. Create
            one to get started.
          </div>
        )}
    </div>
  )
}
