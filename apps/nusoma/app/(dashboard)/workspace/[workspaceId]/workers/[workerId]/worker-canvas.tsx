'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dagre from '@dagrejs/dagre'
import {
  Background,
  ConnectionLineType,
  type EdgeTypes,
  Handle,
  type NodeTypes,
  Position,
  ReactFlow,
  useReactFlow,
} from '@xyflow/react'
import { useParams, useRouter } from 'next/navigation'
import '@xyflow/react/dist/style.css'

import { LoadingAgent } from '@nusoma/design-system/components/ui/loading-logo-animation'
import { createLogger } from '@/lib/logger/console-logger'
import { RealtimeCursors } from '@/app/(dashboard)/workspace/components/collaboration/realtime-cursor'
import { getBlock } from '@/blocks'
import { useUserPermissions } from '@/hooks/use-user-permissions'
import { useWorkerRealtime } from '@/hooks/use-worker-realtime'
import { useWorkspacePermissions } from '@/hooks/use-workspace-permissions'
import { useExecutionStore } from '@/stores/execution/store'
import { useNotificationStore } from '@/stores/notifications/store'
import { usePanelStore } from '@/stores/panel/store'
import { useVariablesStore } from '@/stores/panel/variables/store'
import { useGeneralStore } from '@/stores/settings/general/store'
//import { useSidebarStore } from '@/stores/sidebar/store'
import { fetchWorkersFromDB } from '@/stores/workers/database'
import { useWorkerRegistry } from '@/stores/workers/registry/store'
import { useSubBlockStore } from '@/stores/workers/subblock/store'
import { mergeSubblockState } from '@/stores/workers/utils'
import { useWorkerStore } from '@/stores/workers/worker/store'
import { BlockSelectionPanel } from './components/block-selection-panel'
import { ControlBar } from './components/control-bar/control-bar'
import { LoopNodeComponent } from './components/loop-node/loop-node'
import { NotificationList } from './components/notifications/notifications'
import { Panel } from './components/panel/panel'
import { ParallelNodeComponent } from './components/parallel-node/parallel-node'
import { WorkerBlock } from './components/worker-block/worker-block'
import { WorkerEdge } from './components/worker-edge/worker-edge'
import {
  getNodeAbsolutePosition,
  getNodeDepth,
  getNodeHierarchy,
  isPointInLoopNode,
  resizeLoopNodes,
  updateNodeParent as updateNodeParentUtil,
} from './utils'

const logger = createLogger('Worker')

// Plus Icon Component for adding new blocks
const PlusIconComponent = ({ data }: { data: any }) => {
  return (
    <div className='relative'>
      <Handle
        type='target'
        position={Position.Top}
        id={`target-plus-${data.parentNodeId}`}
        style={{
          background: '#6b7280',
          border: '2px solid #6b7280',
          width: 8,
          height: 8,
          top: -8,
        }}
      />
      <div
        role='button'
        tabIndex={0}
        className='flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-blue-500 shadow-lg transition-colors hover:bg-blue-600'
        onClick={(e) => {
          e.stopPropagation()
          data.onClick()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation()
            data.onClick()
          }
        }}
      >
        <svg
          width='20'
          height='20'
          viewBox='0 0 24 24'
          fill='none'
          stroke='white'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        >
          <title>Add block</title>
          <line x1='12' y1='5' x2='12' y2='19' />
          <line x1='5' y1='12' x2='19' y2='12' />
        </svg>
      </div>
    </div>
  )
}

// Block Selection Panel Node Component
const BlockSelectionPanelNode = ({ data }: { data: any }) => {
  return (
    <div className='pointer-events-auto'>
      <BlockSelectionPanel
        isOpen={true}
        onClose={data.onClose}
        onBlockSelect={data.onBlockSelect}
        position={{ x: 0, y: 0 }} // Position is handled by ReactFlow
        terminalNodeId={data.terminalNodeId}
        isEdgeInsertion={data.isEdgeInsertion}
      />
    </div>
  )
}

// Define custom node and edge types outside the component to prevent recreation
const nodeTypes: NodeTypes = {
  workerBlock: WorkerBlock,
  loopNode: LoopNodeComponent,
  parallelNode: ParallelNodeComponent,
  plusIcon: PlusIconComponent,
  blockSelectionPanel: BlockSelectionPanelNode,
}
const edgeTypes: EdgeTypes = { workerEdge: WorkerEdge }

interface WorkerCanvasProps {
  workerId: string
  workspaceId: string
}

export default function WorkerCanvas({ workerId, workspaceId }: WorkerCanvasProps) {
  // State
  const [isWorkerReady, setIsWorkerReady] = useState(false)
  //const { mode, isExpanded } = useSidebarStore()
  // State for tracking node dragging
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [potentialParentId, setPotentialParentId] = useState<string | null>(null)
  // Enhanced edge selection with parent context and unique identifier
  const [selectedEdgeInfo, setSelectedEdgeInfo] = useState<{
    id: string
    parentLoopId?: string
    contextId?: string // Unique identifier combining edge ID and context
  } | null>(null)
  // Block selection panel state
  const [showBlockPanel, setShowBlockPanel] = useState(false)
  const [blockPanelPosition, setBlockPanelPosition] = useState({ x: 0, y: 0 }) // For block creation
  const [panelDisplayPosition, setPanelDisplayPosition] = useState({ x: 0, y: 0 }) // For panel display
  const [selectedTerminalNodeId, setSelectedTerminalNodeId] = useState<string | null>(null)
  const [skipAutoLayout, setSkipAutoLayout] = useState(false) // Flag to skip auto-layout for manual positioning
  const [preserveNodePositions, setPreserveNodePositions] = useState<Set<string>>(new Set()) // Nodes to exclude from auto-layout
  // Edge insertion state
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)
  const [edgeInsertionData, setEdgeInsertionData] = useState<{
    edgeId: string
    sourceId: string
    targetId: string
    sourceHandle: string
    targetHandle: string
  } | null>(null)
  const [edgeSplitData, setEdgeSplitData] = useState<{
    sourceId: string
    sourceHandle: string
    position: { x: number; y: number }
  } | null>(null)
  const edgeHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // Hooks
  const params = useParams()
  const router = useRouter()
  const { screenToFlowPosition, getNodes, fitView, getViewport } = useReactFlow()

  // Worker registry selectors
  const workers = useWorkerRegistry(useCallback((state) => state.workers, []))
  const activeWorkerId = useWorkerRegistry(useCallback((state) => state.activeWorkerId, []))
  const isLoading = useWorkerRegistry(useCallback((state) => state.isLoading, []))
  const setActiveWorker = useWorkerRegistry(useCallback((state) => state.setActiveWorker, []))
  const createWorker = useWorkerRegistry(useCallback((state) => state.createWorker, []))

  // Workspace permissions
  const {
    permissions: workspacePermissions,
    loading: permissionsLoading,
    error: permissionsError,
  } = useWorkspacePermissions(workspaceId || '')

  // User permissions
  const userPermissions = useUserPermissions(workspaceId || null)

  // Worker store selectors
  const blocks = useWorkerStore(useCallback((state) => state.blocks, []))
  const edges = useWorkerStore(useCallback((state) => state.edges, []))
  const addBlock = useWorkerStore(useCallback((state) => state.addBlock, []))
  const updateNodeDimensions = useWorkerStore(useCallback((state) => state.updateNodeDimensions, []))
  const updateBlockPosition = useWorkerStore(useCallback((state) => state.updateBlockPosition, []))
  const addEdge = useWorkerStore(useCallback((state) => state.addEdge, []))
  const removeEdge = useWorkerStore(useCallback((state) => state.removeEdge, []))
  const updateParentId = useWorkerStore(useCallback((state) => state.updateParentId, []))
  const removeBlock = useWorkerStore(useCallback((state) => state.removeBlock, []))

  // State to force refresh of subblock values
  const [subBlockRefresh, setSubBlockRefresh] = useState(0)

  const allSubBlockValues = useMemo(() => {
    if (!activeWorkerId) return {}

    const subBlockStoreState = useSubBlockStore.getState()
    console.log('SubBlock store state:', {
      activeWorkerId,
      workerValues: subBlockStoreState.workerValues,
      hasWorkerData: !!subBlockStoreState.workerValues[activeWorkerId],
      workerData: subBlockStoreState.workerValues[activeWorkerId],
      conditionBlockRawData:
        subBlockStoreState.workerValues[activeWorkerId]?.['41b97088-5ae5-4c45-a705-46b461f8c55b'],
    })

    const workerState = {
      blocks: useWorkerStore.getState().blocks,
      // Add other necessary state if mergeSubblockState needs it
    }

    // Add debugging for the merge process
    console.log('About to merge subblock state:', {
      activeWorkerId,
      workerBlocks: Object.keys(workerState.blocks),
      subBlockStoreHasWorker: !!subBlockStoreState.workerValues[activeWorkerId],
      subBlockStoreWorkerData: subBlockStoreState.workerValues[activeWorkerId],
    })

    // @ts-ignore
    const result = mergeSubblockState(workerState.blocks, activeWorkerId)
    console.log('allSubBlockValues updated:', {
      activeWorkerId,
      result,
      blockIds: Object.keys(result),
      conditionBlockData: result['41b97088-5ae5-4c45-a705-46b461f8c55b'],
      conditionBlockSubBlocks: result['41b97088-5ae5-4c45-a705-46b461f8c55b']?.subBlocks,
    })
    return result
  }, [activeWorkerId, blocks, subBlockRefresh])

  const { setValue: setSubBlockValue } = useSubBlockStore()
  const { markAllAsRead } = useNotificationStore()
  const { resetLoaded: resetVariablesLoaded } = useVariablesStore()
  const { setSelectedBlockId } = usePanelStore()

  // Execution and debug mode state
  const { activeBlockIds, pendingBlocks } = useExecutionStore()
  const { isDebugModeEnabled } = useGeneralStore()
  const [dragStartParentId, setDragStartParentId] = useState<string | null>(null)

  // Initialize Supabase Realtime for collaboration
  useWorkerRealtime(activeWorkerId)

  // Get loading state from the new store
  const isStorageLoading = useWorkerStore((state) => state._isSubscribed === false)

  // Log permissions when they load
  useEffect(() => {
    if (workspacePermissions) {
      logger.info('Workspace permissions loaded in worker', {
        workspaceId,
        userCount: workspacePermissions.total,
        permissions: workspacePermissions.users.map((u) => ({
          email: u.email,
          permissions: u.permissionType,
        })),
      })
    }
  }, [workspacePermissions, workspaceId])

  // Log permissions errors
  useEffect(() => {
    if (permissionsError) {
      logger.error('Failed to load workspace permissions', {
        workspaceId,
        error: permissionsError,
      })
    }
  }, [permissionsError, workspaceId])

  // Initialize and validate the worker state
  useEffect(() => {
    const init = async () => {
      // Step 1: Set initial state
      setIsWorkerReady(false)

      // Step 2: Fetch workers from the database if they are not already loaded
      const registryState = useWorkerRegistry.getState()
      if (Object.keys(registryState.workers).length === 0 && !registryState.isLoading) {
        try {
          await fetchWorkersFromDB()
        } catch (error) {
          logger.error('Failed to load workers from the database', { error })
          // Optionally, handle this error more gracefully (e.g., show an error message)
          return
        }
      }

      // Step 3: Get the latest state from the worker registry
      const { workers: loadedWorkers, isLoading: stillLoading } = useWorkerRegistry.getState()
      const workerIds = Object.keys(loadedWorkers)

      // If still loading, defer execution
      if (stillLoading) {
        logger.info('Workers are still loading, deferring initialization.')
        return
      }

      // Step 4: Handle the case where no workers exist
      if (workerIds.length === 0) {
        logger.info('No workers found, creating an initial worker.')
        const workerName = `Worker ${Object.keys(loadedWorkers).length + 1}`
        const newWorkerId = createWorker({
          name: workerName,
          description: 'A new agent to get you started.',
          isInitial: true,
        })
        router.replace(`/workspace/${workspaceId}/workers/${newWorkerId}`)
        return
      }

      // Step 5: Validate the current worker ID and navigate if necessary
      if (!loadedWorkers[workerId]) {
        logger.warn(
          `Worker with ID ${workerId} not found, redirecting to the first available worker.`
        )
        router.replace(`/workspace/${workspaceId}/workers/${workerIds[0]}`)
        return
      }

      // Step 6: Set the active worker and perform cleanup
      const currentActiveId = useWorkerRegistry.getState().activeWorkerId
      if (currentActiveId !== workerId) {
        resetVariablesLoaded()
        setActiveWorker(workerId)
        markAllAsRead(workerId)
      }

      // Step 7: Mark the worker as ready
      setIsWorkerReady(true)
    }

    init()
  }, [
    workerId,
    workspaceId,
    router,
    createWorker,
    setActiveWorker,
    markAllAsRead,
    resetVariablesLoaded,
  ])

  // Helper function to update a node's parent with proper position calculation
  const updateNodeParent = useCallback(
    (nodeId: string, newParentId: string | null) => {
      return updateNodeParentUtil(
        nodeId,
        newParentId,
        getNodes,
        updateBlockPosition,
        updateParentId,
        () => resizeLoopNodes(getNodes, updateNodeDimensions, blocks)
      )
    },
    [getNodes, updateBlockPosition, updateParentId, updateNodeDimensions, blocks]
  )

  // Function to resize all loop nodes with improved hierarchy handling
  const resizeLoopNodesWrapper = useCallback(() => {
    return resizeLoopNodes(getNodes, updateNodeDimensions, blocks)
  }, [getNodes, updateNodeDimensions, blocks])

  // Wrapper functions that use the utilities but provide the getNodes function
  const getNodeDepthWrapper = useCallback(
    (nodeId: string): number => {
      return getNodeDepth(nodeId, getNodes)
    },
    [getNodes]
  )

  const getNodeHierarchyWrapper = useCallback(
    (nodeId: string): string[] => {
      return getNodeHierarchy(nodeId, getNodes)
    },
    [getNodes]
  )

  const getNodeAbsolutePositionWrapper = useCallback(
    (nodeId: string): { x: number; y: number } => {
      return getNodeAbsolutePosition(nodeId, getNodes)
    },
    [getNodes]
  )

  const isPointInLoopNodeWrapper = useCallback(
    (position: { x: number; y: number }) => {
      return isPointInLoopNode(position, getNodes)
    },
    [getNodes]
  )

  // Enhanced tree layout function with collision detection and resolution
  const calculateTreeLayout = useCallback(() => {
    const dagreGraph = new dagre.graphlib.Graph()
    dagreGraph.setDefaultEdgeLabel(() => ({}))

    const localNodes = getNodes() // Use React Flow's nodes for up-to-date dimensions

    // Adjust spacing: more vertical, less horizontal
    dagreGraph.setGraph({
      rankdir: 'TB',
      nodesep: 100, // horizontal spacing between nodes at same level
      ranksep: 100, // vertical spacing between rows/levels
      marginx: 50, // horizontal margin
      marginy: 0, // vertical margin
    })

    // Map to store node dimensions
    const nodeDimensions = new Map<string, { width: number; height: number }>()

    localNodes.forEach((node) => {
      let nodeWidth: number
      let nodeHeight: number

      // Special handling for placeholder (plus icon) nodes
      if (node.type === 'plusIcon') {
        // Visual size is 40x40, but give them hidden spacing for layout
        nodeWidth = 300 // Hidden width for proper spacing
        nodeHeight = 300 // Hidden height for proper spacing
      } else {
        // Regular nodes
        nodeWidth = node.width || (blocks[node.id]?.isWide ? 480 : 320)
        nodeHeight = node.height || 120
      }

      nodeDimensions.set(node.id, { width: nodeWidth, height: nodeHeight })

      dagreGraph.setNode(node.id, {
        width: nodeWidth,
        height: nodeHeight,
        label: (node.data?.name as string) || node.type,
      })
      if (node.parentId) {
        dagreGraph.setParent(node.id, node.parentId)
      }
    })

    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target)
    })

    dagre.layout(dagreGraph)

    // Get initial positions from dagre
    const initialPositions = new Map<string, { x: number; y: number }>()
    localNodes.forEach((node) => {
      if (preserveNodePositions.has(node.id)) {
        return
      }

      const nodeWithPosition = dagreGraph.node(node.id)
      if (nodeWithPosition) {
        const position = {
          x: nodeWithPosition.x - (nodeDimensions.get(node.id)?.width || 0) / 2,
          y: nodeWithPosition.y - (nodeDimensions.get(node.id)?.height || 0) / 2,
        }
        initialPositions.set(node.id, position)
      }
    })

    // Collision detection and resolution - simplified and smarter
    const resolveCollisions = (positions: Map<string, { x: number; y: number }>) => {
      const resolvedPositions = new Map(positions)
      const padding = 20 // Reduced padding between nodes

      // Filter out placeholder nodes from collision detection
      const realNodePositions = new Map<string, { x: number; y: number }>()
      positions.forEach((pos, nodeId) => {
        const node = localNodes.find((n) => n.id === nodeId)
        if (node && node.type !== 'plusIcon') {
          realNodePositions.set(nodeId, pos)
        }
      })

      // Sort real nodes by y position (top to bottom) to resolve layer by layer
      const sortedNodes = Array.from(realNodePositions.entries()).sort((a, b) => a[1].y - b[1].y)

      // Group nodes by approximate Y levels (within 100px are considered same level)
      const levels: string[][] = []
      sortedNodes.forEach(([nodeId, pos]) => {
        let addedToLevel = false
        for (const level of levels) {
          if (level.length > 0) {
            const levelY = resolvedPositions.get(level[0])!.y
            if (Math.abs(pos.y - levelY) < 100) {
              level.push(nodeId)
              addedToLevel = true
              break
            }
          }
        }
        if (!addedToLevel) {
          levels.push([nodeId])
        }
      })

      // Resolve collisions within each level - only for real nodes
      levels.forEach((level) => {
        if (level.length <= 1) return

        // Sort nodes in level by x position
        level.sort((a, b) => resolvedPositions.get(a)!.x - resolvedPositions.get(b)!.x)

        // Resolve overlaps by pushing nodes apart - but only check actual overlaps
        for (let i = 1; i < level.length; i++) {
          const currentNode = level[i]
          const prevNode = level[i - 1]

          const currentPos = resolvedPositions.get(currentNode)!
          const prevPos = resolvedPositions.get(prevNode)!

          // Use actual node dimensions, not inflated ones
          const currentNodeObj = localNodes.find((n) => n.id === currentNode)
          const prevNodeObj = localNodes.find((n) => n.id === prevNode)

          //const currentWidth = currentNodeObj?.width || (blocks[currentNode]?.isWide ? 480 : 320)
          const prevWidth = prevNodeObj?.width || (blocks[prevNode]?.isWide ? 480 : 320)

          // Calculate actual overlap
          const prevRight = prevPos.x + prevWidth
          const currentLeft = currentPos.x

          if (prevRight + padding > currentLeft) {
            // Only move if there's actual overlap
            const newX = prevRight + padding
            resolvedPositions.set(currentNode, { ...currentPos, x: newX })
          }
        }
      })

      // Skip complex brute force collision detection - trust dagre + level-based resolution
      // This prevents excessive spreading of nodes that are already well-positioned

      return resolvedPositions
    }

    // Apply collision resolution
    const finalPositions = resolveCollisions(initialPositions)

    // Check for actual changes and update
    const newPositions = new Map<string, { x: number; y: number }>()
    let hasChanges = false

    finalPositions.forEach((newPosition, nodeId) => {
      const currentBlock = blocks[nodeId]
      if (!currentBlock) return

      const deltaX = Math.abs(currentBlock.position.x - newPosition.x)
      const deltaY = Math.abs(currentBlock.position.y - newPosition.y)

      if (deltaX > 1 || deltaY > 1) {
        hasChanges = true
        newPositions.set(nodeId, newPosition)
      }
    })

    if (hasChanges) {
      newPositions.forEach((pos, id) => {
        updateBlockPosition(id, pos)
      })
    }
  }, [getNodes, edges, blocks, updateBlockPosition, preserveNodePositions])

  // Auto-layout handler with longer debounce for better performance
  const debouncedAutoLayout = useCallback(() => {
    const debounceTimer = setTimeout(() => {
      calculateTreeLayout()
    }, 500) // Increased from 250ms to 500ms

    return () => clearTimeout(debounceTimer)
  }, [calculateTreeLayout])

  useEffect(() => {
    let cleanup: (() => void) | null = null

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.shiftKey && event.key === 'L' && !event.ctrlKey && !event.metaKey) {
        // Don't trigger if user is typing in an input, textarea, or contenteditable element
        const activeElement = document.activeElement
        const isEditableElement =
          activeElement instanceof HTMLInputElement ||
          activeElement instanceof HTMLTextAreaElement ||
          activeElement?.hasAttribute('contenteditable')

        if (isEditableElement) {
          return // Allow normal typing behavior
        }

        event.preventDefault()

        if (cleanup) cleanup()

        cleanup = debouncedAutoLayout()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (cleanup) cleanup()
    }
  }, [debouncedAutoLayout])

  useEffect(() => {
    let cleanup: (() => void) | null = null

    const handleAutoLayoutEvent = () => {
      if (cleanup) cleanup()

      cleanup = debouncedAutoLayout()
    }

    window.addEventListener('trigger-auto-layout', handleAutoLayoutEvent)

    return () => {
      window.removeEventListener('trigger-auto-layout', handleAutoLayoutEvent)
      if (cleanup) cleanup()
    }
  }, [debouncedAutoLayout])

  // Initialize worker system
  useEffect(() => {
    const initAndValidate = async () => {
      // First, ensure workers are loaded if they aren't already.
      const { workers, isLoading } = useWorkerRegistry.getState()
      if (Object.keys(workers).length === 0 && !isLoading) {
        try {
          await fetchWorkersFromDB()
        } catch (error) {
          logger.error('Failed to load workers from database:', error)
        }
      }

      // Now, perform validation and navigation with the latest state.
      const { workers: newWorkers, isLoading: newIsLoading } = useWorkerRegistry.getState()
      const workerIds = Object.keys(newWorkers)
      const currentId = workerId || (params.id as string)

      // Wait for loading to complete.
      if (newIsLoading) {
        logger.info('Workers still loading, waiting...')
        return
      }

      // If no workers exist, create an initial one.
      if (workerIds.length === 0) {
        logger.info('No workers found after loading complete, creating initial worker')
        const workerNumber = Object.keys(newWorkers).length + 1
        const workerName = `Worker ${workerNumber}`
        const newId = createWorker({
          name: workerName,
          description: 'Getting started with agents',
          isInitial: true,
        })
        router.replace(`/workspace/${workspaceId}/workers/${newId}`)
        return
      }

      // If the current worker doesn't exist, navigate to the first available one.
      if (!newWorkers[currentId]) {
        router.replace(`/workspace/${workspaceId}/workers/${workerIds[0]}`)
        return
      }

      // Set the active worker and clean up.
      const { activeWorkerId } = useWorkerRegistry.getState()
      if (activeWorkerId !== currentId) {
        resetVariablesLoaded()
        setActiveWorker(currentId)
        markAllAsRead(currentId)
      }
    }

    if (typeof window !== 'undefined') {
      initAndValidate()
    }
  }, [workerId])

  // Handle drops
  const findClosestOutput = useCallback(
    (newNodePosition: { x: number; y: number }) => {
      const existingBlocks = Object.entries(blocks)
        .filter(([_, block]) => block.enabled)
        .map(([id, block]) => ({
          id,
          type: block.type,
          position: block.position,
          distance: Math.sqrt(
            (block.position.x - newNodePosition.x) ** 2 +
            (block.position.y - newNodePosition.y) ** 2
          ),
        }))
        .sort((a, b) => a.distance - b.distance)

      return existingBlocks[0] ? existingBlocks[0] : null
    },
    [blocks]
  )

  // Determine the appropriate source handle based on block type
  const determineSourceHandle = useCallback(
    (block: { id: string; type: string }) => {
      // Default source handle
      let sourceHandle = 'source'

      // For condition blocks, use the first condition handle
      if (block.type === 'condition') {
        // Get the conditions from the block's data
        const blockData = allSubBlockValues[block.id]?.subBlocks?.conditions?.value
        if (blockData) {
          try {
            const conditions = JSON.parse(blockData as string)
            if (conditions && conditions.length > 0) {
              // Use the first condition's ID as the source handle
              sourceHandle = conditions[0].id
            }
          } catch (error) {
            console.error('Failed to parse conditions for source handle:', error)
          }
        }
      }
      // For loop and parallel nodes, use their end source handle
      else if (block.type === 'loop') {
        sourceHandle = 'loop-end-source'
      } else if (block.type === 'parallel') {
        sourceHandle = 'parallel-end-source'
      }

      return sourceHandle
    },
    [allSubBlockValues]
  )

  // Find terminal blocks (blocks without outgoing connections)
  const findTerminalBlocks = useCallback(() => {
    const blocksWithOutgoingConnections = new Set(edges.map((edge) => edge.source))

    return Object.entries(blocks)
      .filter(
        ([blockId, block]) =>
          block.enabled && block.type !== 'starter' && !blocksWithOutgoingConnections.has(blockId)
      )
      .map(([blockId, block]) => ({
        id: blockId,
        type: block.type,
        position: block.position,
        name: block.name,
      }))
  }, [blocks, edges])

  // Create placeholder nodes after terminal blocks
  const createPlaceholderAfterLastConnection = useCallback(() => {
    const terminalBlocks = findTerminalBlocks()

    if (terminalBlocks.length === 0) {
      logger.warn('No terminal blocks found to add placeholder after')
      return
    }

    terminalBlocks.forEach((terminalBlock) => {
      // Calculate position for placeholder node (below the terminal block)
      const placeholderPosition = {
        x: terminalBlock.position.x,
        y: terminalBlock.position.y + 100, // Position below the terminal block
      }

      // Create a unique ID for the placeholder
      const placeholderId = crypto.randomUUID()
      const placeholderName = `Placeholder ${Object.values(blocks).filter((b) => b.name.startsWith('Placeholder')).length + 1}`

      // Add placeholder block (using a simple block type, or we could create a special placeholder type)
      addBlock(placeholderId, 'text', placeholderName, placeholderPosition)

      // Connect the terminal block to the placeholder
      const sourceHandle = determineSourceHandle(terminalBlock)

      addEdge({
        id: crypto.randomUUID(),
        source: terminalBlock.id,
        target: placeholderId,
        sourceHandle,
        targetHandle: 'target',
        type: 'workerEdge',
      })
    })

    logger.info(`Created ${terminalBlocks.length} placeholder nodes after terminal blocks`)
  }, [blocks, findTerminalBlocks, addBlock, addEdge, determineSourceHandle])

  // Listen for toolbar block click events
  useEffect(() => {
    const handleAddBlockFromToolbar = async (event: CustomEvent<{ type: string; insertBetweenEdge?: boolean }>) => {
      if (!userPermissions.canEdit) return
      const { type, insertBetweenEdge } = event.detail

      // Special handling for inserting blocks between existing connections
      if (insertBetweenEdge && edgeInsertionData) {
        const blockConfig = getBlock(type)
        if (!blockConfig) return

        const id = crypto.randomUUID()
        const name = `${blockConfig.name} ${Object.values(blocks).filter((b) => b.type === type).length + 1}`

        const sourceNode = getNodes().find((n) => n.id === edgeInsertionData.sourceId)
        const targetNode = getNodes().find((n) => n.id === edgeInsertionData.targetId)

        if (!sourceNode || !targetNode) return

        const insertPosition = {
          x: (sourceNode.position.x + targetNode.position.x) / 2,
          y: (sourceNode.position.y + targetNode.position.y) / 2,
        }

        await addBlock(id, type, name, insertPosition)

        setPreserveNodePositions((prev) => new Set(prev).add(id))

        removeEdge(edgeInsertionData.edgeId)

        await addEdge({
          id: crypto.randomUUID(),
          source: edgeInsertionData.sourceId,
          target: id,
          sourceHandle: edgeInsertionData.sourceHandle,
          targetHandle: 'target',
          type: 'workerEdge',
        })

        await addEdge({
          id: crypto.randomUUID(),
          source: id,
          target: edgeInsertionData.targetId,
          sourceHandle: 'source',
          targetHandle: edgeInsertionData.targetHandle,
          type: 'workerEdge',
        })

        setHoveredEdgeId(null)
        setEdgeInsertionData(null)
        setShowBlockPanel(false)

        setTimeout(() => {
          debouncedAutoLayout()
        }, 50)

        setTimeout(() => {
          setPreserveNodePositions((prev) => {
            const newSet = new Set(prev)
            newSet.delete(id)
            return newSet
          })
        }, 2000)

        return
      }

      const currentTerminalNodeId =
        selectedTerminalNodeId === 'edge-insertion' ? null : selectedTerminalNodeId
      if (currentTerminalNodeId) {
        const blockConfig = getBlock(type)
        if (!blockConfig) return

        const id = crypto.randomUUID()
        const name = `${blockConfig.name} ${Object.values(blocks).filter((b) => b.type === type).length + 1}`

        // Handle condition blocks with specific condition handles
        let sourceNodeId = currentTerminalNodeId
        let sourceHandle = 'source' // Default handle

        // Extract node ID and condition ID if this is a condition block edge
        if (currentTerminalNodeId.includes(':')) {
          const [nodeId, conditionId] = currentTerminalNodeId.split(':')
          sourceNodeId = nodeId
          sourceHandle = conditionId
        }

        const terminalBlock = blocks[sourceNodeId]
        if (!terminalBlock) return

        // Pre-calculate position using dagre
        const dagreGraph = new dagre.graphlib.Graph()
        dagreGraph.setDefaultEdgeLabel(() => ({}))
        dagreGraph.setGraph({
          rankdir: 'TB',
          nodesep: 100,
          ranksep: 100,
          marginx: 50,
          marginy: 0,
        })

        // Add existing nodes to dagre
        const localNodes = getNodes()
        localNodes.forEach((node) => {
          const nodeWidth = node.width || (blocks[node.id]?.data?.width || 320)
          const nodeHeight = node.height || 120
          dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight })
        })

        // Add new node to dagre
        const newNodeWidth = 480
        const newNodeHeight = 120
        dagreGraph.setNode(id, { width: newNodeWidth, height: newNodeHeight })

        // Add edges to dagre
        edges.forEach((edge) => {
          dagreGraph.setEdge(edge.source, edge.target)
        })
        // Add the new edge
        dagreGraph.setEdge(sourceNodeId, id)

        // Calculate layout
        dagre.layout(dagreGraph)

        // Get calculated position for new node
        const nodeWithPosition = dagreGraph.node(id)
        const position = {
          x: nodeWithPosition.x - newNodeWidth / 2,
          y: nodeWithPosition.y - newNodeHeight / 2,
        }

        // Add block with pre-calculated position
        await addBlock(id, type, name, position)
        setPreserveNodePositions((prev) => new Set(prev).add(id))

        // Add edge
        await addEdge({
          id: crypto.randomUUID(),
          source: sourceNodeId,
          target: id,
          sourceHandle,
          targetHandle: 'target',
          type: 'workerEdge',
        })

        // Keep position preserved for a bit to prevent jitter
        setTimeout(() => {
          setPreserveNodePositions((prev) => {
            const newSet = new Set(prev)
            newSet.delete(id)
            return newSet
          })
        }, 2000)

        return
      }

      // Handle other block types...
      const blockConfig = getBlock(type)
      if (!blockConfig) {
        logger.error('Invalid block type:', { type })
        return
      }

      const centerPosition = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      })

      const id = crypto.randomUUID()
      const name = `${blockConfig.name} ${Object.values(blocks).filter((b) => b.type === type).length + 1}`

      const isAutoConnectEnabled = useGeneralStore.getState().isAutoConnectEnabled
      let position = centerPosition
      const closestBlock =
        isAutoConnectEnabled && type !== 'starter' ? findClosestOutput(centerPosition) : null

      if (closestBlock) {
        // Pre-calculate position using dagre for auto-connected blocks
        const dagreGraph = new dagre.graphlib.Graph()
        dagreGraph.setDefaultEdgeLabel(() => ({}))
        dagreGraph.setGraph({
          rankdir: 'TB',
          nodesep: 100,
          ranksep: 100,
          marginx: 50,
          marginy: 0,
        })

        // Add existing nodes to dagre
        const localNodes = getNodes()
        localNodes.forEach((node) => {
          const nodeWidth = node.width || (blocks[node.id]?.data?.width || 320)
          const nodeHeight = node.height || 120
          dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight })
        })

        // Add new node to dagre
        const newNodeWidth = 480
        const newNodeHeight = 120
        dagreGraph.setNode(id, { width: newNodeWidth, height: newNodeHeight })

        // Add edges to dagre
        edges.forEach((edge) => {
          dagreGraph.setEdge(edge.source, edge.target)
        })
        // Add the new edge
        dagreGraph.setEdge(closestBlock.id, id)

        // Calculate layout
        dagre.layout(dagreGraph)

        // Get calculated position for new node
        const nodeWithPosition = dagreGraph.node(id)
        position = {
          x: nodeWithPosition.x - newNodeWidth / 2,
          y: nodeWithPosition.y - newNodeHeight / 2,
        }
      }

      await addBlock(id, type, name, position)
      setPreserveNodePositions((prev) => new Set(prev).add(id))

      if (closestBlock) {
        const sourceHandle = determineSourceHandle(closestBlock)

        await addEdge({
          id: crypto.randomUUID(),
          source: closestBlock.id,
          target: id,
          sourceHandle,
          targetHandle: 'target',
          type: 'workerEdge',
        })
      }

      // Keep position preserved for a bit to prevent jitter
      setTimeout(() => {
        setPreserveNodePositions((prev) => {
          const newSet = new Set(prev)
          newSet.delete(id)
          return newSet
        })
      }, 2000)
    }

    window.addEventListener(
      'add-block-from-toolbar',
      handleAddBlockFromToolbar as unknown as EventListener
    )

    return () => {
      window.removeEventListener(
        'add-block-from-toolbar',
        handleAddBlockFromToolbar as unknown as EventListener
      )
    }
  }, [
    screenToFlowPosition,
    blocks,
    addBlock,
    addEdge,
    findClosestOutput,
    determineSourceHandle,
    edgeInsertionData,
    removeEdge,
    getNodes,
    selectedTerminalNodeId,
    userPermissions.canEdit,
    edgeSplitData,
    edges,
  ])

  // Memoize block count to prevent unnecessary re-renders
  const blockCount = useMemo(() => Object.keys(blocks).length, [blocks])

  // Track when worker is fully ready for rendering
  useEffect(() => {
    const currentId = workerId || (params.id as string)

    // Reset worker ready state when worker changes
    if (activeWorkerId !== currentId) {
      setIsWorkerReady(false)
      return
    }

    // Check if we have the necessary data to render the worker
    const hasActiveWorker = activeWorkerId === currentId
    const hasWorkerInRegistry = Boolean(workers[currentId])
    const isNotLoading = !isLoading

    // Worker is ready when:
    // 1. We have an active worker that matches the URL
    // 2. The worker exists in the registry
    // 3. Workers are not currently loading
    if (hasActiveWorker && hasWorkerInRegistry && isNotLoading) {
      // Add a small delay to ensure blocks state has settled
      const timeoutId = setTimeout(() => {
        setIsWorkerReady(true)
      }, 100)

      return () => clearTimeout(timeoutId)
    }
    setIsWorkerReady(false)
  }, [activeWorkerId, workerId, workers, isLoading])

  // Init worker
  useEffect(() => {
    const validateAndNavigate = async () => {
      const workerIds = Object.keys(workers)
      const currentId = workerId || (params.id as string)

      // Wait for both initialization and worker loading to complete
      if (isLoading) {
        logger.info('Workers still loading, waiting...')
        return
      }

      // If no workers exist after loading is complete, create initial worker
      if (workerIds.length === 0) {
        logger.info('No workers found after loading complete, creating initial worker')

        // Generate numbered worker name based on existing workers
        const existingWorkerCount = Object.keys(workers).length
        const workerNumber = existingWorkerCount + 1
        const workerName = `Worker ${workerNumber}`

        const newId = createWorker({
          name: workerName,
          description: 'Getting started with agents',
          isInitial: true,
        })
        router.replace(`/workspace/${workspaceId}/workers/${newId}`)
        return
      }

      // Navigate to existing worker or first available
      if (!workers[currentId]) {
        router.replace(`/workspace/${workspaceId}/workers/${workerIds[0]}`)
        return
      }

      // Reset variables loaded state before setting active worker
      resetVariablesLoaded()

      // Always call setActiveWorker when worker ID changes to ensure proper state
      const { activeWorkerId } = useWorkerRegistry.getState()

      if (activeWorkerId !== currentId) {
        setActiveWorker(currentId)
      } else {
        // Even if the worker is already active, call setActiveWorker to ensure state consistency
        setActiveWorker(currentId)
      }

      markAllAsRead(currentId)
    }

    validateAndNavigate()
  }, [
    params.id,
    workerId,
    workers,
    isLoading,
    setActiveWorker,
    createWorker,
    router,
    markAllAsRead,
    resetVariablesLoaded,
    workspaceId,
  ])

  // Transform blocks and loops into ReactFlow nodes
  const nodes = useMemo(() => {
    if (!blocks || Object.keys(blocks).length === 0) return []

    const nodeArray: any[] = []

    // Add block nodes - filter out invalid blocks early
    Object.entries(blocks).forEach(([blockId, block]) => {
      // Skip invalid block IDs (plus icons, edge icons, etc.)
      if (
        blockId.startsWith('plus-') ||
        blockId.startsWith('edge-plus-') ||
        blockId.startsWith('block-selection-panel')
      ) {
        return
      }

      if (!block.type || !block.name) {
        return
      }

      // Handle container nodes differently
      if (block.type === 'loop') {
        nodeArray.push({
          id: block.id,
          type: 'loopNode',
          position: block.position,
          parentId: block.data?.parentId,
          extent: block.data?.extent || undefined,
          draggable: false,
          data: {
            ...block.data,
            width: block.data?.width || 500,
            height: block.data?.height || 300,
          },
        })
        return
      }

      // Handle parallel nodes
      if (block.type === 'parallel') {
        nodeArray.push({
          id: block.id,
          type: 'parallelNode',
          position: block.position,
          parentId: block.data?.parentId,
          extent: block.data?.extent || undefined,
          draggable: false,
          data: {
            ...block.data,
            width: block.data?.width || 500,
            height: block.data?.height || 300,
          },
        })
        return
      }

      const blockConfig = getBlock(block.type)
      if (!blockConfig) {
        return
      }

      const subBlockData = allSubBlockValues[block.id]?.subBlocks
      let conditions
      if (block.type === 'condition') {
        console.log('Processing condition block:', {
          blockId: block.id,
          hasSubBlockData: !!subBlockData,
          hasConditionsValue: !!subBlockData?.conditions?.value,
          conditionsValue: subBlockData?.conditions?.value,
        })

        if (subBlockData?.conditions?.value) {
          try {
            const parsedConditions = JSON.parse(subBlockData.conditions.value as string)
            // Transform to the format expected by WorkerBlock: { id: string; title: string }[]
            conditions = parsedConditions.map((condition: any) => ({
              id: condition.id,
              title: condition.title,
            }))
            console.log('Condition block conditions:', {
              blockId: block.id,
              conditions,
              rawValue: subBlockData.conditions.value,
            })
          } catch (e) {
            console.error('Failed to parse conditions:', e, {
              blockId: block.id,
              rawValue: subBlockData.conditions.value,
            })
            conditions = []
          }
        } else {
          console.log('No conditions data found for condition block:', {
            blockId: block.id,
            subBlockData,
            subBlockKeys: subBlockData ? Object.keys(subBlockData) : 'no subBlockData',
            conditionsSubBlock: subBlockData?.conditions,
            allSubBlockValues: allSubBlockValues[block.id],
          })
          conditions = []
        }
      }

      const isActive = activeBlockIds.has(block.id)
      const isPending = isDebugModeEnabled && pendingBlocks.includes(block.id)

      const nodeData = {
        type: block.type,
        config: blockConfig,
        name: block.name,
        isActive,
        isPending,
        conditions,
      }

      if (block.type === 'condition') {
        console.log('Creating condition node:', { blockId: block.id, nodeData })
      }

      nodeArray.push({
        id: block.id,
        type: 'workerBlock',
        position: block.position,
        parentId: block.data?.parentId,
        draggable: false,
        extent: block.data?.extent || undefined,
        data: nodeData,
        width: block.isWide ? 480 : 320,
        height: 120,
      })
    })

    console.log(
      'Created nodes:',
      nodeArray.map((n) => ({
        id: n.id,
        type: n.data?.type,
        hasConditions: !!n.data?.conditions,
        conditionsCount: n.data?.conditions?.length || 0,
      }))
    )

    return nodeArray
  }, [blocks, activeBlockIds, pendingBlocks, isDebugModeEnabled, allSubBlockValues])

  // Find terminal nodes (nodes without outgoing connections)
  const terminalNodes = useMemo(() => {
    console.log('Calculating terminal nodes, input:', {
      nodesCount: nodes.length,
      edgesCount: edges.length,
    })

    const nodesWithOutgoingEdges = new Set(
      edges.map((edge) => `${edge.source}:${edge.sourceHandle || 'source'}`)
    )

    const terminals: any[] = []

    nodes.forEach((node) => {
      if (node.data.type === 'condition') {
        // Get conditions from allSubBlockValues
        let conditions = []
        try {
          const blockData = allSubBlockValues[node.id]?.subBlocks?.conditions?.value
          if (blockData) {
            conditions = JSON.parse(blockData as string)
          }
        } catch (error) {
          console.error('Error parsing conditions:', error)
        }

        console.log('Found condition node in terminal calculation:', {
          nodeId: node.id,
          hasConditions: conditions.length > 0,
          conditionsCount: conditions.length,
          conditions,
          subBlockValue: allSubBlockValues[node.id]?.subBlocks?.conditions?.value,
        })

        if (conditions.length > 0) {
          conditions.forEach((condition: any) => {
            const conditionKey = `${node.id}:${condition.id}`
            const hasOutgoingEdge = nodesWithOutgoingEdges.has(conditionKey)
            console.log('Condition check:', {
              conditionKey,
              hasOutgoingEdge,
              condition,
              edges: edges.filter((e) => e.source === node.id),
            })
            if (!hasOutgoingEdge) {
              terminals.push({
                ...node,
                isCondition: true,
                condition,
              })
            }
          })
        }
      } else if (
        node.type !== 'loop' &&
        node.type !== 'parallel' &&
        node.data.type !== 'condition'
      ) {
        if (!nodesWithOutgoingEdges.has(`${node.id}:source`)) {
          terminals.push(node)
        }
      }
    })

    console.log('Terminal nodes:', terminals)

    return terminals
  }, [nodes, edges, allSubBlockValues])

  // Handle plus click from edge
  const handleEdgePlusClick = useCallback(
    (
      edgeId: string,
      sourceId: string,
      targetId: string,
      sourceHandle: string,
      targetHandle: string
    ) => {
      // Clear any pending timeouts
      if (edgeHoverTimeoutRef.current) {
        clearTimeout(edgeHoverTimeoutRef.current)
        edgeHoverTimeoutRef.current = null
      }

      // Store edge insertion data
      setEdgeInsertionData({
        edgeId,
        sourceId,
        targetId,
        sourceHandle,
        targetHandle,
      })

      // Set flag to indicate this is an edge insertion
      setSelectedTerminalNodeId('edge-insertion')

      // Calculate midpoint for panel positioning
      const sourceNode = nodes.find((n) => n.id === sourceId)
      const targetNode = nodes.find((n) => n.id === targetId)

      if (sourceNode && targetNode) {
        const sourceBlock = blocks[sourceId]
        const targetBlock = blocks[targetId]

        const sourceWidth = sourceBlock?.isWide ? 480 : 320
        const targetWidth = targetBlock?.isWide ? 480 : 320

        const sourceHandleX = sourceNode.position.x + sourceWidth / 2
        const sourceHandleY = sourceNode.position.y + (sourceNode.height || 120)
        const targetHandleX = targetNode.position.x + targetWidth / 2
        const targetHandleY = targetNode.position.y

        const midX = (sourceHandleX + targetHandleX) / 2
        const midY = (sourceHandleY + targetHandleY) / 2
        const midpoint = { x: midX - 16, y: midY - 16 }

        // Position the panel at the midpoint
        setPanelDisplayPosition({
          x: midpoint.x - 180,
          y: midpoint.y,
        })

        setBlockPanelPosition(midpoint)
      }

      setShowBlockPanel(true)

      // Clear hover state
      setHoveredEdgeId(null)
    },
    [nodes, blocks]
  )

  // Handle split click from edge
  const handleEdgeSplitClick = useCallback(
    (sourceId: string, sourceHandle: string, midpoint: { x: number; y: number }) => {
      if (edgeHoverTimeoutRef.current) {
        clearTimeout(edgeHoverTimeoutRef.current)
        edgeHoverTimeoutRef.current = null
      }

      // Store the split data - we'll use the source node as the "terminal" for positioning
      setEdgeSplitData({
        sourceId,
        sourceHandle,
        position: { x: 0, y: 0 }, // Will be calculated when block is selected
      })
      setEdgeInsertionData(null)
      setSelectedTerminalNodeId(sourceId) // Use source node for positioning logic

      // Get the source node for panel positioning
      const sourceNode = getNodes().find((n) => n.id === sourceId)
      if (!sourceNode) return

      const sourceBlock = blocks[sourceId]
      const sourceWidth = sourceBlock?.isWide ? 480 : 320
      const sourceHeight = 120

      // Position the panel near the source node
      const panelPosition = {
        x: sourceNode.position.x + sourceWidth / 2 - 180,
        y: sourceNode.position.y + sourceHeight + 50,
      }

      setPanelDisplayPosition(panelPosition)
      setShowBlockPanel(true)
      setHoveredEdgeId(null)
    },
    [getNodes, blocks]
  )

  // Create plus icon nodes for terminal nodes - optimized with reduced dependencies
  const plusIconNodes = useMemo(() => {
    // Early return if no terminal nodes to avoid unnecessary computation
    if (!terminalNodes || terminalNodes.length === 0) {
      return []
    }

    return terminalNodes.map((terminalNode) => {
      // Get the block state to check if it's wide
      const blockState = blocks[terminalNode.id]
      const isWideBlock = blockState?.isWide || false

      // Use the correct CSS-based widths: 320px normal, 480px wide
      const nodeWidth = isWideBlock ? 480 : 320

      // Use the actual node height from React Flow, or default to 120px
      const nodeHeight = 100
      const plusIconWidth = 40

      // Calculate safe spacing to prevent overlap - ensure at least 80px gap
      const verticalSpacing = Math.max(80, nodeHeight * 0.5)

      if (terminalNode.isCondition) {
        const conditions = terminalNode.data.conditions
        const conditionIndex = conditions.findIndex((c: any) => c.id === terminalNode.condition.id)

        const xPos =
          terminalNode.position.x +
          (nodeWidth / (conditions.length + 1)) * (conditionIndex + 1) -
          plusIconWidth / 2

        return {
          id: `plus-${terminalNode.condition.id}`,
          type: 'plusIcon',
          position: {
            x: xPos,
            y: terminalNode.position.y + nodeHeight + verticalSpacing,
          },
          width: 40,
          height: 40,
          data: {
            parentNodeId: terminalNode.id,
            onClick: (event?: React.MouseEvent) => {
              // For condition blocks, use the format nodeId:conditionId
              setSelectedTerminalNodeId(`${terminalNode.id}:${terminalNode.condition.id}`)

              const plusIconPosition = {
                x: xPos,
                y: terminalNode.position.y + nodeHeight + verticalSpacing,
              }

              const panelPosition = {
                x: plusIconPosition.x - 180,
                y: plusIconPosition.y,
              }

              setBlockPanelPosition(plusIconPosition)
              setPanelDisplayPosition(panelPosition)
              setShowBlockPanel(true)
            },
          },
          draggable: false,
          selectable: false,
        }
      }

      return {
        id: `plus-${terminalNode.id}`,
        type: 'plusIcon',
        position: {
          x: terminalNode.position.x + nodeWidth / 2 - plusIconWidth / 2,
          y: terminalNode.position.y + nodeHeight + verticalSpacing,
        },
        width: 40,
        height: 40,
        data: {
          parentNodeId: terminalNode.id,
          onClick: (event?: React.MouseEvent) => {
            // Show block selection panel instead of directly creating placeholder
            setSelectedTerminalNodeId(terminalNode.id)

            // Use the EXACT position of this plus icon for both panel and new blocks
            const plusIconPosition = {
              x: terminalNode.position.x + nodeWidth / 2 - plusIconWidth / 2,
              y: terminalNode.position.y + nodeHeight + verticalSpacing,
            }

            // Position the panel near the plus icon (slightly offset for better UX)
            const panelPosition = {
              x: plusIconPosition.x - 180, // Offset so panel doesn't cover the plus icon
              y: plusIconPosition.y, // Same Y as plus icon
            }

            setBlockPanelPosition(plusIconPosition) // Store the plus icon position for block creation
            setPanelDisplayPosition(panelPosition) // Store the offset position for panel display
            setShowBlockPanel(true)
          },
        },
        draggable: false,
        selectable: false,
      }
    })
  }, [
    terminalNodes, // Track the full array to detect position changes
    blocks, // Track blocks to detect width changes (isWide property)
    // Remove function dependencies to prevent unnecessary recalculation
    // setSelectedTerminalNodeId, setBlockPanelPosition, setPanelDisplayPosition, setShowBlockPanel
  ])

  // Create arrow edges from terminal nodes to plus icons
  const plusIconEdges = useMemo(() => {
    if (!terminalNodes || terminalNodes.length === 0) return []

    return terminalNodes
      .flatMap((terminalNode: any) => {
        if (terminalNode.isCondition) {
          // For condition blocks, create an edge for each condition
          return {
            id: `edge-to-plus-${terminalNode.condition.id}`,
            source: terminalNode.id,
            sourceHandle: terminalNode.condition.id, // Use condition ID directly
            target: `plus-${terminalNode.condition.id}`,
            targetHandle: `target-plus-${terminalNode.id}`,
            type: 'smoothstep',
            animated: false,
            style: {
              stroke: '#6b7280',
              strokeWidth: 2,
              strokeDasharray: '5,5',
            },
            markerEnd: {
              type: 'arrowclosed',
              color: '#6b7280',
              width: 8,
              height: 8,
            },
            selectable: false,
            deletable: false,
          }
        }

        const blockType = terminalNode.data?.type
        if (!blockType || ['loop', 'parallel'].includes(blockType)) {
          return null
        }

        // For other blocks, create a single edge
        return {
          id: `edge-to-plus-${terminalNode.id}`,
          source: terminalNode.id,
          sourceHandle: 'source',
          target: `plus-${terminalNode.id}`,
          targetHandle: `target-plus-${terminalNode.id}`,
          type: 'smoothstep',
          animated: false,
          style: {
            stroke: '#6b7280',
            strokeWidth: 2,
            strokeDasharray: '5,5',
          },
          markerEnd: {
            type: 'arrowclosed',
            color: '#6b7280',
            width: 8,
            height: 8,
          },
          selectable: false,
          deletable: false,
        }
      })
      .filter(Boolean)
  }, [terminalNodes])

  // Compute all nodes for ReactFlow (including plus icons, etc.)
  const allNodes = useMemo(() => {
    const allNodesList = [...nodes, ...plusIconNodes]

    // Add block selection panel node if it should be shown
    if (showBlockPanel) {
      allNodesList.push({
        id: 'block-selection-panel',
        type: 'blockSelectionPanel',
        position: panelDisplayPosition,
        data: {
          onClose: () => {
            setShowBlockPanel(false)
            setEdgeInsertionData(null)
            setSelectedTerminalNodeId(null)
            setEdgeSplitData(null)
          },
          onBlockSelect: () => { },
          terminalNodeId:
            selectedTerminalNodeId === 'edge-insertion' ? undefined : selectedTerminalNodeId,
          isEdgeInsertion: selectedTerminalNodeId === 'edge-insertion',
          isEdgeSplit: !!edgeSplitData,
        },
        draggable: false,
        selectable: false,
        deletable: false,
      })
    }

    return allNodesList
  }, [
    nodes,
    plusIconNodes,
    showBlockPanel,
    panelDisplayPosition,
    selectedTerminalNodeId,
    edgeSplitData,
  ])

  const allEdges = useMemo(() => {
    // Add hover state and plus click handler to worker edges
    const enhancedEdges = edges.map((edge) => ({
      ...edge,
      data: {
        ...edge.data,
        isHovered: hoveredEdgeId === edge.id && !showBlockPanel,
        isSelected: selectedEdgeInfo?.id === edge.id,
        onPlusClick: handleEdgePlusClick,
        onSplitClick: handleEdgeSplitClick,
        onDelete: (edgeId: string) => {
          removeEdge(edgeId)
          setSelectedEdgeInfo(null)
        },
        sourceId: edge.source,
        targetId: edge.target,
        sourceHandle: edge.sourceHandle || 'source',
        targetHandle: edge.targetHandle || 'target',
      },
    }))

    return [...enhancedEdges, ...plusIconEdges]
  }, [
    edges,
    plusIconEdges,
    hoveredEdgeId,
    showBlockPanel,
    selectedEdgeInfo,
    removeEdge,
    // Remove function dependencies - they're defined with useCallback and stable
  ])

  // Ref to track if initial layout has been applied
  const [hasAppliedInitialLayout, setHasAppliedInitialLayout] = useState(false)

  // Effect to automatically apply tree layout when worker is ready
  useEffect(() => {
    if (!isWorkerReady || blockCount === 0 || hasAppliedInitialLayout) return

    // Apply initial layout only once when worker becomes ready
    calculateTreeLayout()
    setHasAppliedInitialLayout(true)
  }, [isWorkerReady, blockCount, hasAppliedInitialLayout, calculateTreeLayout])

  // Reset layout flag when worker changes
  useEffect(() => {
    setHasAppliedInitialLayout(false)
  }, [workerId])

  // Re-apply layout when new blocks are added or edges change - optimized
  useEffect(() => {
    if (!isWorkerReady || !hasAppliedInitialLayout || skipAutoLayout) return

    // Use longer debounce and requestAnimationFrame for better performance
    const layoutTimer = setTimeout(() => {
      requestAnimationFrame(() => {
        calculateTreeLayout()
      })
    }, 300) // Increased debounce from 100ms to 300ms

    return () => clearTimeout(layoutTimer)
  }, [
    edges.length, // Only track edges length, not the full edges array
    blockCount,
    isWorkerReady,
    hasAppliedInitialLayout,
    calculateTreeLayout,
    skipAutoLayout,
  ])

  // Update nodes - let ReactFlow handle dragging natively
  const onNodesChange = useCallback(
    (changes: any) => {
      // Only update our store for position changes when dragging finishes
      changes.forEach((change: any) => {
        if (change.type === 'position' && change.dragging === false && blocks[change.id]) {
          // Update our store only when dragging is complete
          updateBlockPosition(change.id, change.position)

          // Resize containers when dragging finishes
          const node = getNodes().find((n) => n.id === change.id)
          if (node?.parentId) {
            requestAnimationFrame(() => {
              resizeLoopNodesWrapper()
            })
          }
        }
      })
    },
    [blocks, updateBlockPosition, resizeLoopNodesWrapper, getNodes]
  )

  // Effect to resize loops when nodes change (add/remove/position change)
  useEffect(() => {
    // Skip during initial render when nodes aren't loaded yet
    if (nodes.length === 0) return

    // Debounce the resize operation to avoid excessive calls
    const timeoutId = setTimeout(() => {
      resizeLoopNodesWrapper()
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [nodes.length, resizeLoopNodesWrapper])

  // Special effect to handle cleanup after node deletion
  useEffect(() => {
    // Create a mapping of node IDs to check for missing parent references
    const nodeIds = new Set(Object.keys(blocks))

    // Check for nodes with invalid parent references
    Object.entries(blocks).forEach(([id, block]) => {
      const parentId = block.data?.parentId

      // If block has a parent reference but parent no longer exists
      if (parentId && !nodeIds.has(parentId)) {
        logger.warn('Found orphaned node with invalid parent reference', {
          nodeId: id,
          missingParentId: parentId,
        })

        // Fix the node by removing its parent reference and calculating absolute position
        const absolutePosition = getNodeAbsolutePositionWrapper(id)

        // Update the node to remove parent reference and use absolute position
        updateBlockPosition(id, absolutePosition)
        updateParentId(id, '', 'parent')
      }
    })
  }, [blocks, updateBlockPosition, updateParentId, getNodeAbsolutePositionWrapper])

  // Effect to clean up any invalid 'plus-' blocks that may have been saved to state
  useEffect(() => {
    Object.keys(blocks).forEach((blockId) => {
      if (blockId.startsWith('plus-')) {
        logger.warn(`Removing invalid 'plus-' block from state: ${blockId}`)
        removeBlock(blockId)
      }
    })
  }, [blocks, removeBlock])

  // Update edges
  const onEdgesChange = useCallback(
    (changes: any) => {
      changes.forEach((change: any) => {
        if (change.type === 'remove') {
          removeEdge(change.id)
        }
      })
    },
    [removeEdge]
  )

  // Handle connections with improved parent tracking
  const onConnect = useCallback(
    (connection: any) => {
      if (connection.source && connection.target) {
        // Prevent self-connections
        if (connection.source === connection.target) {
          return
        }

        // Check if connecting nodes across container boundaries
        const sourceNode = getNodes().find((n) => n.id === connection.source)
        const targetNode = getNodes().find((n) => n.id === connection.target)

        if (!sourceNode || !targetNode) return

        // Get parent information (handle container start node case)
        const sourceParentId =
          sourceNode.parentId ||
          (connection.sourceHandle === 'loop-start-source' ||
            connection.sourceHandle === 'parallel-start-source'
            ? connection.source
            : undefined)
        const targetParentId = targetNode.parentId

        // Generate a unique edge ID
        const edgeId = crypto.randomUUID()

        // Special case for container start source: Always allow connections to nodes within the same container
        if (
          (connection.sourceHandle === 'loop-start-source' ||
            connection.sourceHandle === 'parallel-start-source') &&
          targetNode.parentId === sourceNode.id
        ) {
          // This is a connection from container start to a node inside the container - always allow
          addEdge({
            ...connection,
            id: edgeId,
            type: 'workerEdge',
            // Add metadata about the container context
            data: {
              parentId: sourceNode.id,
              isInsideContainer: true,
            },
          })
          return
        }

        // Prevent connections across container boundaries
        if (
          (sourceParentId && !targetParentId) ||
          (!sourceParentId && targetParentId) ||
          (sourceParentId && targetParentId && sourceParentId !== targetParentId)
        ) {
          return
        }

        // Track if this connection is inside a container
        const isInsideContainer = Boolean(sourceParentId) || Boolean(targetParentId)
        const parentId = sourceParentId || targetParentId

        // For condition blocks, use the sourceHandle directly as it's already the condition ID
        // Add appropriate metadata for container context
        addEdge({
          ...connection,
          id: edgeId,
          type: 'workerEdge',
          data: isInsideContainer
            ? {
              parentId,
              isInsideContainer,
            }
            : undefined,
        })
      }
    },
    [addEdge, getNodes]
  )

  // Handle node drag to detect intersections with container nodes
  const onNodeDrag = useCallback(
    (event: React.MouseEvent, node: any) => {
      // Early validation - skip invalid or system nodes
      if (
        !node.id ||
        node.id.startsWith('plus-') ||
        node.id.startsWith('edge-plus-') ||
        !blocks[node.id]
      ) {
        return
      }

      // Store currently dragged node ID
      setDraggedNodeId(node.id)

      // Get the current parent ID of the node being dragged
      const currentParentId = blocks[node.id]?.data?.parentId || null

      // Check if this is a starter block - starter blocks should never be in containers
      const isStarterBlock = node.data?.type === 'starter'
      if (isStarterBlock) {
        // If it's a starter block, remove any highlighting and don't allow it to be dragged into containers
        if (potentialParentId) {
          const prevElement = document.querySelector(`[data-id="${potentialParentId}"]`)
          if (prevElement) {
            prevElement.classList.remove('loop-node-drag-over', 'parallel-node-drag-over')
          }
          setPotentialParentId(null)
          document.body.style.cursor = ''
        }
        return // Exit early - don't process any container intersections for starter blocks
      }

      // Get the node's absolute position to properly calculate intersections
      const nodeAbsolutePos = getNodeAbsolutePositionWrapper(node.id)

      // Find intersections with container nodes using absolute coordinates
      const intersectingNodes = getNodes()
        .filter((n) => {
          // Only consider container nodes that aren't the dragged node
          if ((n.type !== 'loopNode' && n.type !== 'parallelNode') || n.id === node.id) return false

          // Skip if this container is already the parent of the node being dragged
          if (n.id === currentParentId) return false

          // Skip self-nesting: prevent a container from becoming its own descendant
          if (node.type === 'loopNode' || node.type === 'parallelNode') {
            // Get the full hierarchy of the potential parent
            const hierarchy = getNodeHierarchyWrapper(n.id)

            // If the dragged node is in the hierarchy, this would create a circular reference
            if (hierarchy.includes(node.id)) {
              return false // Avoid circular nesting
            }
          }

          // Get the container's absolute position
          const containerAbsolutePos = getNodeAbsolutePositionWrapper(n.id)

          // Get dimensions based on node type
          const nodeWidth =
            node.type === 'loopNode' || node.type === 'parallelNode'
              ? node.data?.width || 500
              : node.type === 'condition'
                ? 250
                : 350

          const nodeHeight =
            node.type === 'loopNode' || node.type === 'parallelNode'
              ? node.data?.height || 300
              : node.type === 'condition'
                ? 150
                : 100

          // Check intersection using absolute coordinates
          const nodeRect = {
            left: nodeAbsolutePos.x,
            right: nodeAbsolutePos.x + nodeWidth,
            top: nodeAbsolutePos.y,
            bottom: nodeAbsolutePos.y + nodeHeight,
          }

          const containerRect = {
            left: containerAbsolutePos.x,
            right: containerAbsolutePos.x + (Number(n.data?.width) || 500),
            top: containerAbsolutePos.y,
            bottom: containerAbsolutePos.y + (Number(n.data?.height) || 300),
          }

          // Check intersection with absolute coordinates for accurate detection
          return (
            nodeRect.left < containerRect.right &&
            nodeRect.right > containerRect.left &&
            nodeRect.top < containerRect.bottom &&
            nodeRect.bottom > containerRect.top
          )
        })
        // Add more information for sorting
        .map((n) => ({
          container: n,
          depth: getNodeDepthWrapper(n.id),
          // Calculate size for secondary sorting
          size: (Number(n.data?.width) || 500) * (Number(n.data?.height) || 300),
        }))

      // Update potential parent if there's at least one intersecting container node
      if (intersectingNodes.length > 0) {
        // Sort by depth first (deepest/most nested containers first), then by size if same depth
        const sortedContainers = intersectingNodes.sort((a, b) => {
          // First try to compare by hierarchy depth
          if (a.depth !== b.depth) {
            return b.depth - a.depth // Higher depth (more nested) comes first
          }
          // If same depth, use size as secondary criterion
          return a.size - b.size // Smaller container takes precedence
        })

        // Use the most appropriate container (deepest or smallest at same depth)
        const bestContainerMatch = sortedContainers[0]

        // Add a check to see if the bestContainerMatch is a part of the hierarchy of the node being dragged
        const hierarchy = getNodeHierarchyWrapper(node.id)
        if (hierarchy.includes(bestContainerMatch.container.id)) {
          setPotentialParentId(null)
          return
        }

        setPotentialParentId(bestContainerMatch.container.id)

        // Add highlight class and change cursor
        const containerElement = document.querySelector(
          `[data-id="${bestContainerMatch.container.id}"]`
        )
        if (containerElement) {
          // Apply appropriate class based on container type
          if (bestContainerMatch.container.type === 'loopNode') {
            containerElement.classList.add('loop-node-drag-over')
          } else if (bestContainerMatch.container.type === 'parallelNode') {
            containerElement.classList.add('parallel-node-drag-over')
          }
          document.body.style.cursor = 'copy'
        }
      } else {
        // Remove highlighting if no longer over a container
        if (potentialParentId) {
          const prevElement = document.querySelector(`[data-id="${potentialParentId}"]`)
          if (prevElement) {
            prevElement.classList.remove('loop-node-drag-over', 'parallel-node-drag-over')
          }
          setPotentialParentId(null)
          document.body.style.cursor = ''
        }
      }
    },
    [
      getNodes,
      potentialParentId,
      blocks,
      getNodeHierarchyWrapper,
      getNodeAbsolutePositionWrapper,
      getNodeDepthWrapper,
    ]
  )

  // Add in a nodeDrag start event to set the dragStartParentId
  const onNodeDragStart = useCallback(
    (event: React.MouseEvent, node: any) => {
      // Early validation - skip invalid or system nodes
      if (!node || !node.id || node.type === 'plusIcon' || node.type === 'blockSelectionPanel') {
        return
      }
      setDraggedNodeId(node.id)
      const parentId = node.parentNode || null
      setDragStartParentId(parentId)
    },
    [setDraggedNodeId, setDragStartParentId]
  )

  // Handle node drag stop to establish parent-child relationships
  const onNodeDragStop = useCallback(
    (event: React.MouseEvent, node: any) => {
      // Early validation - skip invalid or system nodes
      if (
        !node.id ||
        node.id.startsWith('plus-') ||
        node.id.startsWith('edge-plus-') ||
        !blocks[node.id]
      ) {
        return
      }

      // Clear UI effects
      document.querySelectorAll('.loop-node-drag-over, .parallel-node-drag-over').forEach((el) => {
        el.classList.remove('loop-node-drag-over', 'parallel-node-drag-over')
      })
      document.body.style.cursor = ''

      // Don't process if the node hasn't actually changed parent or is being moved within same parent
      if (potentialParentId === dragStartParentId) return

      // Check if this is a starter block - starter blocks should never be in containers
      const isStarterBlock = node.data?.type === 'starter'
      if (isStarterBlock) {
        logger.warn('Prevented starter block from being placed inside a container', {
          blockId: node.id,
          attemptedParentId: potentialParentId,
        })
        // Reset state without updating parent
        setDraggedNodeId(null)
        setPotentialParentId(null)
        return // Exit early - don't allow starter blocks to have parents
      }

      // If we're dragging a container node, do additional checks to prevent circular references
      if ((node.type === 'loopNode' || node.type === 'parallelNode') && potentialParentId) {
        // Get the hierarchy of the potential parent container
        const parentHierarchy = getNodeHierarchyWrapper(potentialParentId)

        // If the dragged node is in the parent's hierarchy, it would create a circular reference
        if (parentHierarchy.includes(node.id)) {
          logger.warn('Prevented circular container nesting', {
            draggedNodeId: node.id,
            draggedNodeType: node.type,
            potentialParentId,
            parentHierarchy,
          })
          return
        }
      }

      // Update the node's parent relationship
      if (potentialParentId) {
        // Moving to a new parent container
        updateNodeParent(node.id, potentialParentId)
      }

      // Reset state
      setDraggedNodeId(null)
      setPotentialParentId(null)
    },
    [getNodes, dragStartParentId, potentialParentId, updateNodeParent, getNodeHierarchyWrapper]
  )

  // Update onPaneClick to only handle edge selection
  const onPaneClick = useCallback(() => {
    setSelectedEdgeInfo(null)
    // Close the block selection panel when clicking on empty space
    setShowBlockPanel(false)
    setSelectedBlockId(null)
  }, [setSelectedBlockId])

  // Edge hover handlers
  const onEdgeMouseEnter = useCallback(
    (event: React.MouseEvent, edge: any) => {
      // Skip plus icon edges and other special edges
      if (edge.id.startsWith('edge-to-plus-') || edge.type !== 'workerEdge') return

      // Don't show edge plus icons when block panel is open
      if (showBlockPanel) return

      // Clear any pending timeout that would hide the plus icon
      if (edgeHoverTimeoutRef.current) {
        clearTimeout(edgeHoverTimeoutRef.current)
        edgeHoverTimeoutRef.current = null
      }

      setHoveredEdgeId(edge.id)
      setEdgeInsertionData({
        edgeId: edge.id,
        sourceId: edge.source,
        targetId: edge.target,
        sourceHandle: edge.sourceHandle || 'source',
        targetHandle: edge.targetHandle || 'target',
      })
    },
    [showBlockPanel]
  )

  const onEdgeMouseLeave = useCallback(
    (event: React.MouseEvent, edge: any) => {
      // Don't handle mouse leave if block panel is open
      if (showBlockPanel) return

      // Clear any existing timeout
      if (edgeHoverTimeoutRef.current) {
        clearTimeout(edgeHoverTimeoutRef.current)
      }

      // Set a delay before hiding the plus icon to allow user to move to it
      edgeHoverTimeoutRef.current = setTimeout(() => {
        setHoveredEdgeId(null)
        setEdgeInsertionData(null)
      }, 300) // 300ms delay
    },
    [showBlockPanel]
  )

  // Edge selection
  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: any) => {
      event.stopPropagation() // Prevent bubbling

      // Determine if edge is inside a loop by checking its source/target nodes
      const sourceNode = getNodes().find((n) => n.id === edge.source)
      const targetNode = getNodes().find((n) => n.id === edge.target)

      // An edge is inside a loop if either source or target has a parent
      // If source and target have different parents, prioritize source's parent
      const parentLoopId = sourceNode?.parentId || targetNode?.parentId

      // Create a unique identifier that combines edge ID and parent context
      const contextId = `${edge.id}${parentLoopId ? `-${parentLoopId}` : ''}`

      setSelectedEdgeInfo({
        id: edge.id,
        parentLoopId,
        contextId,
      })
    },
    [getNodes]
  )

  // Handle keyboard shortcuts with better edge tracking
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedEdgeInfo) {
        // Only delete the specific selected edge
        removeEdge(selectedEdgeInfo.id)
        setSelectedEdgeInfo(null)
      }
      // Close panel on Escape key
      if (event.key === 'Escape' && showBlockPanel) {
        setShowBlockPanel(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedEdgeInfo, removeEdge, showBlockPanel])

  // Handle sub-block value updates from custom events
  useEffect(() => {
    const handleSubBlockValueUpdate = (event: CustomEvent) => {
      const { blockId, subBlockId, value } = event.detail
      console.log('SubBlock value update:', { blockId, subBlockId, value, valueType: typeof value })

      if (blockId && subBlockId) {
        // Use the new worker store action to update and persist the value
        useWorkerStore.getState().updateSubBlockValue(blockId, subBlockId, value)

        // Trigger refresh of allSubBlockValues when subblock values change
        setSubBlockRefresh((prev) => prev + 1)

        // If this is a conditions update, log it specifically
        if (subBlockId === 'conditions') {
          console.log('Conditions update detected:', { blockId, value })
        }
      }
    }

    window.addEventListener('update-subblock-value', handleSubBlockValueUpdate as EventListener)

    return () => {
      window.removeEventListener(
        'update-subblock-value',
        handleSubBlockValueUpdate as EventListener
      )
    }
  }, [])

  // Cleanup edge hover timeout on unmount
  useEffect(() => {
    return () => {
      if (edgeHoverTimeoutRef.current) {
        clearTimeout(edgeHoverTimeoutRef.current)
      }
    }
  }, [])

  // Global drag prevention for React Flow elements
  useEffect(() => {
    const preventDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement

      // Check if the drag is happening on React Flow elements
      if (
        target.closest('.react-flow') ||
        target.closest('.react-flow__edge') ||
        target.closest('[data-testid="worker-edge"]') ||
        target.tagName === 'path' ||
        target.tagName === 'svg' ||
        target.closest('svg')
      ) {
        e.preventDefault()
        e.stopPropagation()
        e.dataTransfer!.effectAllowed = 'none'
        e.dataTransfer!.setDragImage(new Image(), 0, 0)
        return false
      }
    }

    const preventMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      // Check if clicking on edge elements
      if (
        target.closest('.react-flow__edge') ||
        target.closest('[data-testid="worker-edge"]') ||
        target.tagName === 'path' ||
        (target.tagName === 'svg' && target.closest('.react-flow'))
      ) {
        // Don't prevent the event entirely, just prevent default drag behavior
        target.setAttribute('draggable', 'false')
      }
    }

    document.addEventListener('dragstart', preventDragStart, true)
    document.addEventListener('mousedown', preventMouseDown, true)

    return () => {
      document.removeEventListener('dragstart', preventDragStart, true)
      document.removeEventListener('mousedown', preventMouseDown, true)
    }
  }, [])

  if (!isWorkerReady || isStorageLoading) {
    return (
      <div className='flex h-screen w-full items-center justify-center'>
        <div className='flex flex-col items-center gap-4'>
          <LoadingAgent size='lg' />
          <p className='text-muted-foreground text-sm'>
            {isStorageLoading ? 'Loading collaboration data...' : 'Loading worker...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='relative h-screen w-full flex-col overflow-hidden'>
      {/* Add CSS to fix drag ghost image */}
      <style jsx global>{`
        /* Hide the default drag image when creating connections */
        .react-flow__connectionline {
          pointer-events: none;
        }
        
        /* Prevent ghost images during connection dragging */
        .react-flow__handle.connecting,
        .react-flow__handle.connectingfrom,
        .react-flow__handle.connectingto {
          pointer-events: auto !important;
        }
        
        /* Hide drag preview image */
        .react-flow .react-flow__selection {
          display: none !important;
        }
        
        /* Fix cursor during connection creation */
        .react-flow__pane.connecting {
          cursor: crosshair !important;
        }
        
        /* Ensure handles are always visible during connection */
        .react-flow__node:hover .react-flow__handle {
          opacity: 1 !important;
        }
        
        /* Hide any default browser drag image */
        .react-flow__node {
          -webkit-user-drag: none;
          -khtml-user-drag: none;
          -moz-user-drag: none;
          -o-user-drag: none;
          user-drag: none;
        }
      `}</style>

      <div className='absolute top-0 left-0 z-10 w-full transition-all duration-200'>
        <ControlBar />
      </div>
      {/* User presence display */}
      <RealtimeCursors />
      <div className={`relative h-full w-full flex-1 transition-all duration-200`}>
        <div className='fixed top-0 right-0 z-10'>
          <Panel />
          <NotificationList />
        </div>
        <ReactFlow
          nodes={allNodes}
          edges={allEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={userPermissions.canEdit ? onConnect : undefined}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ type: 'workerEdge' }}
          proOptions={{ hideAttribution: true }}
          connectionLineStyle={{
            stroke: '#94a3b8',
            strokeWidth: 2,
            strokeDasharray: '5,5',
          }}
          connectionLineType={ConnectionLineType.SmoothStep}
          onNodeClick={(e, node) => {
            e.stopPropagation()
          }}
          onPaneClick={onPaneClick}
          onEdgeClick={onEdgeClick}
          onEdgeMouseEnter={onEdgeMouseEnter}
          onEdgeMouseLeave={onEdgeMouseLeave}
          elementsSelectable={true}
          nodesConnectable={userPermissions.canEdit}
          nodesDraggable={false}
          draggable={true}
          noWheelClassName='allow-scroll'
          edgesFocusable={true}
          className='worker-container h-full'
          snapToGrid={false}
          snapGrid={[15, 15]}
          elevateEdgesOnSelect={true}
          elevateNodesOnSelect={true}
          autoPanOnConnect={userPermissions.canEdit}
          autoPanOnNodeDrag={false}
          panOnDrag={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          zoomOnDoubleClick={false}
          selectNodesOnDrag={false}
          deleteKeyCode={['Delete', 'Backspace']}
          multiSelectionKeyCode={['Meta', 'Control']}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          minZoom={0.5}
          maxZoom={2}
          fitView
          fitViewOptions={{
            padding: 0.5,
            includeHiddenNodes: false,
            minZoom: 0.5,
            maxZoom: 2,
          }}
          style={{ background: 'transparent' }}
          // These props help prevent drag image issues
          onConnectStart={(event, { nodeId, handleId }) => {
            // Prevent default drag behavior for drag events
            if ('dataTransfer' in event && event.dataTransfer) {
              const dragEvent = event as DragEvent
              dragEvent.dataTransfer!.effectAllowed = 'none'
              dragEvent.dataTransfer!.setDragImage(new Image(), 0, 0)
            }
          }}
          // Additional event handlers to prevent ghost images
          onMouseDown={(event) => {
            // Check if clicking on an edge or edge element
            const target = event.target as HTMLElement
            if (
              target.closest('.react-flow__edge') ||
              target.closest('[data-testid="worker-edge"]')
            ) {
              event.preventDefault()
            }
          }}
          onNodeDragStart={onNodeDragStart}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
        >
          <Background />
        </ReactFlow>
      </div>
    </div>
  )
}
