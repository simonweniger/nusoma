import { supabase } from '@nusoma/database/supabase'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Edge } from '@xyflow/react'
import { produce } from 'immer'
import { create } from 'zustand'
import { getBlock } from '@/blocks'
import { resolveOutputType } from '@/blocks/utils'
import { createHistoryEntry, type History, type HistoryActions } from '../middleware'
import { useWorkerRegistry } from '../registry/store'
import { useSubBlockStore } from '../subblock/store'
import { mergeSubblockState } from '../utils'
import type { SubBlockState, WorkerState, WorkerStore } from './types'
import { generateLoopBlocks, generateParallelBlocks } from './utils'

export interface WorkerStoreWithHistory extends WorkerStore, HistoryActions {
  history: History
  revertToDeployedState: (deployedState: WorkerState) => void

  _realtimeChannel: RealtimeChannel | null
  _presenceChannel: RealtimeChannel | null
  _isSubscribed: boolean
  _isInitializing: boolean
  session: any | null

  initializeRealtime: (workerId: string, session: any) => Promise<void>
  cleanupRealtime: () => void
  updatePresence: (payload: { cursor?: { x: number; y: number } | undefined }) => void

  _handleBlockChange: (payload: RealtimePostgresChangesPayload<any>) => void
  _handleEdgeChange: (payload: RealtimePostgresChangesPayload<any>) => void

  _loadInitialData: (workerId: string) => Promise<void>
  _saveBlockToDatabase: (workerId: string, block: any) => Promise<void>
  _deleteBlockFromDatabase: (blockId: string) => Promise<void>
  _saveEdgeToDatabase: (workerId: string, edge: Edge) => Promise<void>
  _deleteEdgeFromDatabase: (edgeId: string) => Promise<void>

  _broadcastState: () => void

  cursors: Record<string, any>
}

const initialState: WorkerState = {
  blocks: {},
  edges: [],
  loops: {},
  parallels: {},
  lastSaved: undefined,
  lastUpdate: undefined,
  isDeployed: false,
  isPublished: false,
  deployedAt: undefined,
  deploymentStatuses: {},
  needsRedeployment: false,
  hasActiveSchedule: false,
  hasActiveWebhook: false,
  cursors: {},
}

const initialHistoryState: History = {
  past: [],
  present: createHistoryEntry(initialState, 'Initial State', null),
  future: [],
}

const MAX_HISTORY_LENGTH = 50

export const useWorkerStore = create<WorkerStoreWithHistory>()((set, get) => ({
  ...initialState,
  history: initialHistoryState,

  // --- History Actions ---
  canUndo: () => get().history.past.length > 0,
  canRedo: () => get().history.future.length > 0,

  undo: () => {
    const { history } = get()
    if (!get().canUndo()) return

    const previous = history.past[history.past.length - 1]
    const newPast = history.past.slice(0, history.past.length - 1)

    set({
      ...previous.state,
      history: {
        past: newPast,
        present: previous,
        future: [history.present, ...history.future],
      },
      lastSaved: Date.now(),
    })

    const activeWorkerId = useWorkerRegistry.getState().activeWorkerId
    if (previous.subblockValues && activeWorkerId) {
      useSubBlockStore.setState({
        workerValues: {
          ...useSubBlockStore.getState().workerValues,
          [activeWorkerId]: previous.subblockValues,
        },
      })
    }
  },

  redo: () => {
    const { history } = get()
    if (!get().canRedo()) return

    const next = history.future[0]
    const newFuture = history.future.slice(1)

    set({
      ...next.state,
      history: {
        past: [...history.past, history.present],
        present: next,
        future: newFuture,
      },
      lastSaved: Date.now(),
    })

    const activeWorkerId = useWorkerRegistry.getState().activeWorkerId
    if (next.subblockValues && activeWorkerId) {
      useSubBlockStore.setState({
        workerValues: {
          ...useSubBlockStore.getState().workerValues,
          [activeWorkerId]: next.subblockValues,
        },
      })
    }
  },

  pushHistory: (action: string) => {
    const { history, ...rest } = get()
    const activeWorkerId = useWorkerRegistry.getState().activeWorkerId
    const stateForHistory: Partial<WorkerState> = {
      blocks: rest.blocks,
      edges: rest.edges,
      loops: rest.loops,
      parallels: rest.parallels,
    }

    const newEntry = createHistoryEntry(stateForHistory, action, activeWorkerId)
    const newPast = [...history.past, history.present]
    if (newPast.length > MAX_HISTORY_LENGTH) {
      newPast.shift()
    }

    set({
      history: {
        past: newPast,
        present: newEntry,
        future: [],
      },
      lastSaved: Date.now(),
    })
  },

  clearHistory: () => {
    set({ history: initialHistoryState })
  },

  revertToHistoryState: (index: number) => {
    const { history } = get()
    const allStates = [...history.past, history.present, ...history.future]
    const targetState = allStates[index]

    if (!targetState) return

    const newPast = allStates.slice(0, index)
    const newFuture = allStates.slice(index + 1)

    set({
      ...targetState.state,
      history: {
        past: newPast,
        present: targetState,
        future: newFuture,
      },
      lastSaved: Date.now(),
    })

    const activeWorkerId = useWorkerRegistry.getState().activeWorkerId
    if (targetState.subblockValues && activeWorkerId) {
      useSubBlockStore.setState({
        workerValues: {
          ...useSubBlockStore.getState().workerValues,
          [activeWorkerId]: targetState.subblockValues,
        },
      })
    }
  },

  revertToDeployedState: (deployedState: WorkerState) => {
    set(deployedState)
    get().pushHistory('Revert to Deployed State')
  },

  // --- Real-time & Presence ---
  _realtimeChannel: null,
  _presenceChannel: null,
  _isSubscribed: false,
  _isInitializing: false,
  session: null,

  initializeRealtime: async (workerId: string, session: any) => {
    if (get()._isSubscribed || get()._isInitializing) {
      console.log('Realtime already initialized, skipping')
      return
    }

    console.log(`Initializing realtime for worker: ${workerId}`)
    set({ _isInitializing: true, session })

    try {
      // Force cleanup any existing channels
      await get().cleanupRealtime()

      // Create a single unified channel with timestamp for uniqueness
      const timestamp = Date.now()
      const channelName = `worker-unified-${workerId}-${timestamp}`

      console.log(`Creating unified channel: ${channelName}`)
      const channel = supabase.channel(channelName)

      // Set up all listeners on the single channel
      channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'worker_blocks',
            filter: `worker_id=eq.${workerId}`,
          },
          (payload) => get()._handleBlockChange(payload)
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'worker_edges',
            filter: `worker_id=eq.${workerId}`,
          },
          (payload) => get()._handleEdgeChange(payload)
        )
        .on('presence', { event: 'sync' }, () => {
          const presenceState = channel.presenceState()
          const newCursors: Record<string, any> = {}
          const currentUserId = session?.user?.id

          for (const key in presenceState) {
            const presences = presenceState[key] as unknown as any[]
            presences?.forEach((p) => {
              if (p.user_id !== currentUserId && p.cursor) {
                newCursors[p.user_id] = {
                  position: p.cursor,
                  user: { id: p.user_id, name: p.user_name },
                  color: p.color,
                }
              }
            })
          }
          set({ cursors: newCursors })
        })

      // Subscribe with timeout and proper error handling
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Subscription timeout')), 10000)

        channel.subscribe(async (status) => {
          clearTimeout(timeout)
          console.log(`Channel status: ${status}`)

          if (status === 'SUBSCRIBED') {
            // Track user presence if we have user data
            if (session?.user) {
              try {
                await channel.track({
                  user_id: session.user.id,
                  user_name: session.user.name || session.user.email || 'Anonymous',
                  online_at: new Date().toISOString(),
                  color: `hsl(${session.user.id.charCodeAt(0) % 360}, 100%, 70%)`,
                })
              } catch (e) {
                console.warn('Failed to track presence:', e)
              }
            }
            resolve()
          } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            reject(new Error(`Channel failed: ${status}`))
          }
        })
      })

      set({
        _realtimeChannel: channel,
        _presenceChannel: channel, // Use same channel for both
        _isSubscribed: true,
        _isInitializing: false,
      })

      console.log('Realtime initialization complete')
      await get()._loadInitialData(workerId)
    } catch (error) {
      console.error('Failed to initialize realtime:', error)
      await get().cleanupRealtime()
      set({ _isInitializing: false })
      throw error
    }
  },

  _broadcastState: () => {
    // This method was previously used for manual broadcasting
    // Now we rely on postgres_changes for real-time synchronization
    // Keep this method for backward compatibility but make it a no-op
    console.log('_broadcastState called - relying on postgres_changes for sync')
  },

  cleanupRealtime: async () => {
    console.log('Cleaning up realtime connections')
    const { _realtimeChannel } = get()

    // Set flags immediately
    set({
      _isSubscribed: false,
      _isInitializing: false,
      cursors: {},
    })

    if (_realtimeChannel) {
      try {
        console.log('Unsubscribing from channel...')
        await _realtimeChannel.unsubscribe()
        console.log('Removing channel...')
        await supabase.removeChannel(_realtimeChannel)
        console.log('Channel cleanup complete')
      } catch (error) {
        console.warn('Error during channel cleanup:', error)
      }
    }

    // Clear all references
    set({
      _realtimeChannel: null,
      _presenceChannel: null,
      session: null,
    })

    console.log('Realtime cleanup complete')
  },

  updatePresence: (payload: { cursor?: { x: number; y: number } | undefined }) => {
    const { _presenceChannel, _isSubscribed, session } = get()
    if (_presenceChannel && _isSubscribed && session?.user) {
      _presenceChannel.track({
        ...payload,
        user_id: session.user.id,
        user_name: session.user.user_metadata?.full_name || 'Anonymous',
      })
    }
  },

  // --- Data Loading and Sync ---
  _loadInitialData: async (workerId: string) => {
    try {
      const { data: blocksData, error: blocksError } = await supabase
        .from('worker_blocks')
        .select('*')
        .eq('worker_id', workerId)
      if (blocksError) throw blocksError

      const { data: edgesData, error: edgesError } = await supabase
        .from('worker_edges')
        .select('*')
        .eq('worker_id', workerId)
      if (edgesError) throw edgesError

      const blocks: Record<string, any> = {}
      blocksData?.forEach((dbBlock) => {
        blocks[dbBlock.id] = {
          id: dbBlock.id,
          type: dbBlock.type,
          name: dbBlock.name,
          position: { x: Number(dbBlock.position_x), y: Number(dbBlock.position_y) },
          subBlocks: dbBlock.sub_blocks || {},
          outputs: dbBlock.outputs || {},
          enabled: dbBlock.enabled,
          horizontalHandles: dbBlock.horizontal_handles,
          isWide: dbBlock.is_wide,
          height: Number(dbBlock.height),
          data: {
            ...dbBlock.data,
            ...(dbBlock.parent_id && { parentId: dbBlock.parent_id, extent: dbBlock.extent }),
          },
        }
      })

      const edges: Edge[] =
        edgesData?.map((dbEdge) => ({
          id: dbEdge.id,
          source: dbEdge.source_block_id,
          target: dbEdge.target_block_id,
          sourceHandle: dbEdge.source_handle,
          targetHandle: dbEdge.target_handle,
        })) || []

      set({
        blocks,
        edges,
        loops: generateLoopBlocks(blocks),
        parallels: generateParallelBlocks(blocks),
      })
      get().pushHistory('Load Initial Data')
    } catch (error) {
      console.error('Error loading initial data:', error)
    }
  },

  _handleBlockChange: (payload: RealtimePostgresChangesPayload<any>) => {
    console.log('Processing block change:', payload)
    const { eventType, new: newRecord, old: oldRecord } = payload

    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      if (!newRecord) {
        console.warn('No new record in block change payload')
        return
      }

      // Check if this change is from the current session to prevent cursor jumping
      // We'll use a simple debounce approach - if we just updated this block recently,
      // skip the realtime update to prevent interfering with active typing
      const currentState = get()
      const existingBlock = currentState.blocks[newRecord.id]

      if (existingBlock && currentState.lastUpdate) {
        const timeSinceLastUpdate = Date.now() - currentState.lastUpdate
        // If we updated this block within the last 2 seconds, skip the realtime update
        // to prevent cursor jumping during typing
        if (timeSinceLastUpdate < 2000) {
          console.log('Skipping realtime update to prevent cursor jumping during active editing')
          return
        }
      }

      const block = {
        id: newRecord.id,
        type: newRecord.type,
        name: newRecord.name,
        position: { x: Number(newRecord.position_x), y: Number(newRecord.position_y) },
        subBlocks: newRecord.sub_blocks || {},
        outputs: newRecord.outputs || {},
        enabled: newRecord.enabled,
        horizontalHandles: newRecord.horizontal_handles,
        isWide: newRecord.is_wide,
        height: Number(newRecord.height),
        data: {
          ...newRecord.data,
          ...(newRecord.parent_id && { parentId: newRecord.parent_id, extent: newRecord.extent }),
        },
      }

      // Update the blocks in the worker store
      set((state) => ({
        blocks: {
          ...state.blocks,
          [newRecord.id]: block,
        },
        // Don't update lastUpdate here to avoid triggering the debounce for legitimate remote changes
      }))

      // Sync sub-block values to the sub-block store
      if (newRecord.sub_blocks && Object.keys(newRecord.sub_blocks).length > 0) {
        const activeWorkerId = useWorkerRegistry.getState().activeWorkerId
        if (activeWorkerId) {
          console.log('Syncing sub-block values from realtime:', {
            blockId: newRecord.id,
            subBlocks: newRecord.sub_blocks,
          })

          // Extract sub-block values from the database record
          const newSubBlockValues = Object.entries(newRecord.sub_blocks).reduce(
            (acc, [id, subBlock]: [string, any]) => {
              acc[id] = subBlock.value
              return acc
            },
            {} as Record<string, any>
          )

          // Update the sub-block store with the new values
          useSubBlockStore.setState((state) => ({
            workerValues: {
              ...state.workerValues,
              [activeWorkerId]: {
                ...state.workerValues[activeWorkerId],
                [newRecord.id]: {
                  ...state.workerValues[activeWorkerId]?.[newRecord.id],
                  ...newSubBlockValues,
                },
              },
            },
          }))

          console.log('Sub-block values synced to store')
        }
      }

      console.log(`Block ${eventType.toLowerCase()}d:`, block.id)
    } else if (eventType === 'DELETE') {
      if (!oldRecord) {
        console.warn('No old record in block delete payload')
        return
      }

      // Remove block from worker store
      set((state) => {
        const newBlocks = { ...state.blocks }
        delete newBlocks[oldRecord.id]
        return {
          blocks: newBlocks,
          // Don't update lastUpdate here either
        }
      })

      // Remove sub-block values from sub-block store
      const activeWorkerId = useWorkerRegistry.getState().activeWorkerId
      if (activeWorkerId) {
        useSubBlockStore.setState((state) => {
          const newWorkerValues = { ...state.workerValues }
          if (newWorkerValues[activeWorkerId]) {
            delete newWorkerValues[activeWorkerId][oldRecord.id]
          }
          return { workerValues: newWorkerValues }
        })
      }

      console.log('Block deleted:', oldRecord.id)
    }
  },

  _handleEdgeChange: (payload: RealtimePostgresChangesPayload<any>) => {
    console.log('Processing edge change:', payload)
    const { eventType, new: newRecord, old: oldRecord } = payload

    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      if (!newRecord) {
        console.warn('No new record in edge change payload')
        return
      }

      const edge = {
        id: newRecord.id,
        source: newRecord.source_block_id,
        target: newRecord.target_block_id,
        sourceHandle: newRecord.source_handle || undefined,
        targetHandle: newRecord.target_handle || undefined,
      }

      set((state) => {
        const newEdges = state.edges.filter((e) => e.id !== edge.id)
        newEdges.push(edge)
        return {
          edges: newEdges,
          lastUpdate: Date.now(),
        }
      })

      console.log(`Edge ${eventType.toLowerCase()}d:`, edge.id)
    } else if (eventType === 'DELETE') {
      if (!oldRecord) {
        console.warn('No old record in edge delete payload')
        return
      }

      set((state) => ({
        edges: state.edges.filter((edge) => edge.id !== oldRecord.id),
        lastUpdate: Date.now(),
      }))

      console.log('Edge deleted:', oldRecord.id)
    }
  },

  // --- Database Persistence ---
  _saveBlockToDatabase: async (workerId, block) => {
    try {
      const { error } = await supabase
        .from('worker_blocks')
        .upsert(
          {
            id: block.id,
            worker_id: workerId,
            type: block.type,
            name: block.name,
            position_x: block.position.x,
            position_y: block.position.y,
            enabled: block.enabled,
            horizontal_handles: block.horizontalHandles,
            is_wide: block.isWide,
            height: block.height,
            sub_blocks: block.subBlocks || {},
            outputs: block.outputs || {},
            data: block.data || {},
            parent_id: block.data?.parentId || null,
            extent: block.data?.extent || null,
          },
          { onConflict: 'id' }
        )
        .select()

      if (error) {
        console.error('Error saving block to database. Details:', JSON.stringify(error, null, 2))
        throw new Error(`Failed to save block ${block.id}: ${error.message}`)
      }
    } catch (e: any) {
      console.error('An unexpected error occurred while saving block:', JSON.stringify(e, null, 2))
      const errorMessage = e.message || 'Unknown error'
      throw new Error(`Failed to save block ${block.id}: ${errorMessage}`)
    }
  },

  _deleteBlockFromDatabase: async (blockId: string) => {
    const { error } = await supabase.from('worker_blocks').delete().eq('id', blockId)
    if (error) {
      console.error('Error deleting block:', error)
      throw error
    }
  },

  _saveEdgeToDatabase: async (workerId, edge) => {
    const { error } = await supabase.from('worker_edges').upsert({
      id: edge.id,
      worker_id: workerId,
      source_block_id: edge.source,
      target_block_id: edge.target,
      source_handle: edge.sourceHandle || null,
      target_handle: edge.targetHandle || null,
    })
    if (error) {
      console.error('Error saving edge:', JSON.stringify(error, null, 2))
      throw error
    }
  },

  _deleteEdgeFromDatabase: async (edgeId) => {
    const { error } = await supabase.from('worker_edges').delete().eq('id', edgeId)
    if (error) {
      console.error('Error deleting edge:', error)
      throw error
    }
  },

  // --- Worker Actions ---
  setNeedsRedeploymentFlag: (needsRedeployment) => {
    if (get().isDeployed) {
      set({ needsRedeployment })
    }
  },

  addBlock: async (id, type, name, position, data, parentId, extent) => {
    const workerId = useWorkerRegistry.getState().activeWorkerId
    if (!workerId) return

    const blockConfig = getBlock(type)
    const nodeData = { ...data, ...(parentId && { parentId, extent: extent || 'parent' }) }
    let block

    if (blockConfig) {
      const subBlocks: Record<string, SubBlockState> = {}
      blockConfig.subBlocks.forEach((subBlock) => {
        subBlocks[subBlock.id] = { id: subBlock.id, type: subBlock.type, value: null }
      })
      block = {
        id,
        type,
        name,
        position,
        subBlocks,
        outputs: resolveOutputType(blockConfig.outputs, subBlocks),
        enabled: true,
        horizontalHandles: false,
        isWide: false,
        height: 0,
        data: nodeData,
      }
    } else {
      // Handle non-standard blocks like loop/parallel containers
      block = {
        id,
        type,
        name,
        position,
        subBlocks: {},
        outputs: {},
        enabled: true,
        horizontalHandles: false,
        isWide: false,
        height: 0,
        data: nodeData,
      }
    }

    set((state) => ({ blocks: { ...state.blocks, [id]: block } }))
    await get()._saveBlockToDatabase(workerId, block)
    get().pushHistory(`Add ${name}`)
    get()._broadcastState()
  },

  updateBlockPosition: async (id, position) => {
    const workerId = useWorkerRegistry.getState().activeWorkerId
    if (!workerId) return

    const block = get().blocks[id]
    if (!block) return

    const updatedBlock = { ...block, position }
    set((state) => ({ blocks: { ...state.blocks, [id]: updatedBlock } }))
    await get()._saveBlockToDatabase(workerId, updatedBlock)
    get()._broadcastState()
    // We don't push history for this to avoid flooding it with move events
  },

  removeBlock: async (id) => {
    const workerId = useWorkerRegistry.getState().activeWorkerId
    if (!workerId) return

    const originalState = { blocks: get().blocks, edges: get().edges }
    const blockName = originalState.blocks[id]?.name || 'Block'

    const blocksToRemove = new Set([id])
    const findAllDescendants = (parentId: string) => {
      Object.values(originalState.blocks).forEach((block) => {
        if (block.data?.parentId === parentId) {
          blocksToRemove.add(block.id)
          findAllDescendants(block.id)
        }
      })
    }
    findAllDescendants(id)

    const newBlocks = { ...originalState.blocks }
    blocksToRemove.forEach((blockId) => delete newBlocks[blockId])

    const edgesToRemove = originalState.edges.filter(
      (edge) => blocksToRemove.has(edge.source) || blocksToRemove.has(edge.target)
    )
    const newEdges = originalState.edges.filter(
      (edge) => !edgesToRemove.find((e) => e.id === edge.id)
    )

    // Optimistic UI update
    set({
      blocks: newBlocks,
      edges: newEdges,
      loops: generateLoopBlocks(newBlocks),
      parallels: generateParallelBlocks(newBlocks),
    })
    get().pushHistory(`Remove ${blockName}`)

    try {
      await Promise.all(edgesToRemove.map((edge) => get()._deleteEdgeFromDatabase(edge.id)))
      await Promise.all(
        Array.from(blocksToRemove).map((blockId) => get()._deleteBlockFromDatabase(blockId))
      )
      get()._broadcastState()
    } catch (error) {
      console.error('Failed to delete block, reverting UI:', error)
      set({ ...originalState }) // Revert on failure
    }
  },

  addEdge: async (edge) => {
    const workerId = useWorkerRegistry.getState().activeWorkerId
    if (!workerId) return

    const isDuplicate = get().edges.some(
      (e) =>
        e.source === edge.source &&
        e.target === edge.target &&
        e.sourceHandle === edge.sourceHandle &&
        e.targetHandle === edge.targetHandle
    )
    if (isDuplicate) return

    const newEdge = { ...edge, id: edge.id || crypto.randomUUID() }
    const originalEdges = get().edges

    set({ edges: [...originalEdges, newEdge] }) // Optimistic update
    get().pushHistory('Add Edge')

    try {
      await get()._saveEdgeToDatabase(workerId, newEdge)
      get()._broadcastState()
    } catch (error) {
      console.error('Failed to save edge, reverting UI:', error)
      set({ edges: originalEdges }) // Revert on failure
    }
  },

  removeEdge: async (edgeId) => {
    const workerId = useWorkerRegistry.getState().activeWorkerId
    if (!workerId) return

    const originalEdges = get().edges
    set({ edges: originalEdges.filter((e) => e.id !== edgeId) }) // Optimistic update
    get().pushHistory('Remove Edge')

    try {
      await get()._deleteEdgeFromDatabase(edgeId)
      get()._broadcastState()
    } catch (error) {
      console.error('Failed to delete edge, reverting UI:', error)
      set({ edges: originalEdges }) // Revert on failure
    }
  },

  clear: () => {
    const clearedState = { ...initialState, history: initialHistoryState, lastSaved: Date.now() }
    set(clearedState)
    const activeWorkerId = useWorkerRegistry.getState().activeWorkerId
    get().pushHistory('Clear Worker')
    return clearedState
  },

  updateLastSaved: () => set({ lastSaved: Date.now() }),

  updateNodeDimensions: async (id, dimensions) => {
    const workerId = useWorkerRegistry.getState().activeWorkerId
    if (!workerId) return

    const block = get().blocks[id]
    if (!block) return

    const updatedBlock = { ...block, data: { ...block.data, ...dimensions } }
    set((state) => ({ blocks: { ...state.blocks, [id]: updatedBlock } }))
    await get()._saveBlockToDatabase(workerId, updatedBlock)
    get().pushHistory(`Resize ${updatedBlock.name}`)
  },

  updateParentId: async (id, parentId, extent) => {
    const workerId = useWorkerRegistry.getState().activeWorkerId
    if (!workerId) return

    const block = get().blocks[id]
    if (!block) return

    const newData = !parentId ? { ...block.data } : { ...block.data, parentId, extent }
    if (!parentId && newData.parentId) {
      delete newData.parentId
      delete newData.extent
    }

    const updatedBlock = { ...block, data: newData }
    set((state) => ({ blocks: { ...state.blocks, [id]: updatedBlock } }))
    await get()._saveBlockToDatabase(workerId, updatedBlock)
    get().pushHistory(`Update parent for ${updatedBlock.name}`)
  },

  toggleBlockEnabled: async (id) => {
    const workerId = useWorkerRegistry.getState().activeWorkerId
    if (!workerId) return

    const block = get().blocks[id]
    if (!block) return

    const updatedBlock = { ...block, enabled: !block.enabled }
    set((state) => ({ blocks: { ...state.blocks, [id]: updatedBlock } }))
    await get()._saveBlockToDatabase(workerId, updatedBlock)
    get().pushHistory(`Toggle ${updatedBlock.name}`)
  },

  duplicateBlock: async (id) => {
    const block = get().blocks[id]
    if (!block) return

    const newId = crypto.randomUUID()
    const offsetPosition = { x: block.position.x + 250, y: block.position.y + 20 }
    const match = block.name.match(/(.*?)(\\d+)?$/)
    const newName = match?.[2] ? `${match[1]}${Number.parseInt(match[2]) + 1}` : `${block.name} 1`

    const mergedBlock = mergeSubblockState(get().blocks, id)[id]
    const newSubBlocks = Object.entries(mergedBlock.subBlocks).reduce(
      (acc, [subId, subBlock]) => ({
        ...acc,
        [subId]: { ...subBlock, value: JSON.parse(JSON.stringify(subBlock.value)) },
      }),
      {}
    )

    const newBlock = {
      ...block,
      id: newId,
      name: newName,
      position: offsetPosition,
      subBlocks: newSubBlocks,
    }

    await get().addBlock(
      newBlock.id,
      newBlock.type,
      newBlock.name,
      newBlock.position,
      newBlock.data
    )
    // addBlock already pushes history
  },

  toggleBlockHandles: async (id) => {
    const workerId = useWorkerRegistry.getState().activeWorkerId
    if (!workerId) return

    const block = get().blocks[id]
    if (!block) return

    const updatedBlock = { ...block, horizontalHandles: !block.horizontalHandles }
    set((state) => ({ blocks: { ...state.blocks, [id]: updatedBlock } }))
    await get()._saveBlockToDatabase(workerId, updatedBlock)
    get().pushHistory(`Toggle handles for ${updatedBlock.name}`)
  },

  updateBlockName: async (id, name) => {
    const workerId = useWorkerRegistry.getState().activeWorkerId
    if (!workerId) return

    const block = get().blocks[id]
    if (!block) return

    const originalName = block.name
    const updatedBlock = { ...block, name }
    set((state) => ({ blocks: { ...state.blocks, [id]: updatedBlock } }))
    await get()._saveBlockToDatabase(workerId, updatedBlock)
    get().pushHistory(`Rename ${originalName} to ${name}`)
  },

  toggleBlockWide: async (id) => {
    const workerId = useWorkerRegistry.getState().activeWorkerId
    if (!workerId) return

    const block = get().blocks[id]
    if (!block) return

    const updatedBlock = { ...block, isWide: !block.isWide }
    set((state) => ({ blocks: { ...state.blocks, [id]: updatedBlock } }))
    await get()._saveBlockToDatabase(workerId, updatedBlock)
    get().pushHistory(`Toggle wide mode for ${updatedBlock.name}`)
  },

  updateBlockHeight: async (id, height) => {
    const workerId = useWorkerRegistry.getState().activeWorkerId
    if (!workerId) return

    const block = get().blocks[id]
    if (!block) return

    const updatedBlock = { ...block, height }
    set((state) => ({ blocks: { ...state.blocks, [id]: updatedBlock } }))
    await get()._saveBlockToDatabase(workerId, updatedBlock)
    get().pushHistory(`Update height for ${updatedBlock.name}`)
  },

  updateSubBlockValue: async (blockId, subBlockId, value) => {
    const workerId = useWorkerRegistry.getState().activeWorkerId
    if (!workerId) return

    const block = get().blocks[blockId]
    if (!block) return

    // Get all current values for this block from the sub-block store
    const subBlockValues = useSubBlockStore.getState().workerValues[workerId]?.[blockId] || {}
    // Create an updated map of values including the new one
    const newValues = { ...subBlockValues, [subBlockId]: value }

    // Create the fully updated block object for saving
    const updatedBlock = produce(block, (draft) => {
      Object.keys(newValues).forEach((key) => {
        if (draft.subBlocks[key]) {
          draft.subBlocks[key].value = newValues[key]
        }
      })
    })

    // Optimistically update the main worker store
    set((state) => ({
      blocks: { ...state.blocks, [blockId]: updatedBlock },
    }))

    // Optimistically update the sub-block store
    useSubBlockStore.setState(
      produce((draft) => {
        if (!draft.workerValues[workerId]) draft.workerValues[workerId] = {}
        draft.workerValues[workerId][blockId] = newValues
      })
    )

    // Save to database
    await get()._saveBlockToDatabase(workerId, updatedBlock)
  },

  generateLoopBlocks: () => generateLoopBlocks(get().blocks),
  generateParallelBlocks: () => generateParallelBlocks(get().blocks),

  updateLoopCount: async (loopId, count) => {
    const workerId = useWorkerRegistry.getState().activeWorkerId
    if (!workerId) return

    const block = get().blocks[loopId]
    if (!block || block.type !== 'loop') return

    const updatedBlock = {
      ...block,
      data: { ...block.data, count: Math.max(1, Math.min(50, count)) },
    }
    set((state) => ({ blocks: { ...state.blocks, [loopId]: updatedBlock } }))
    await get()._saveBlockToDatabase(workerId, updatedBlock)
    get().pushHistory(`Update loop count for ${updatedBlock.name}`)
  },

  updateLoopType: async (loopId, loopType) => {
    const workerId = useWorkerRegistry.getState().activeWorkerId
    if (!workerId) return

    const block = get().blocks[loopId]
    if (!block || block.type !== 'loop') return

    const updatedBlock = { ...block, data: { ...block.data, loopType } }
    set((state) => ({ blocks: { ...state.blocks, [loopId]: updatedBlock } }))
    await get()._saveBlockToDatabase(workerId, updatedBlock)
    get().pushHistory(`Update loop type for ${updatedBlock.name}`)
  },

  updateLoopCollection: async (loopId, collection) => {
    const workerId = useWorkerRegistry.getState().activeWorkerId
    if (!workerId) return

    const block = get().blocks[loopId]
    if (!block || block.type !== 'loop') return

    const updatedBlock = { ...block, data: { ...block.data, collection } }
    set((state) => ({ blocks: { ...state.blocks, [loopId]: updatedBlock } }))
    await get()._saveBlockToDatabase(workerId, updatedBlock)
    get().pushHistory(`Update loop collection for ${updatedBlock.name}`)
  },

  triggerUpdate: () => set({ lastUpdate: Date.now() }),

  setScheduleStatus: (hasActiveSchedule) => {
    if (get().hasActiveSchedule !== hasActiveSchedule) {
      set({ hasActiveSchedule })
      get().updateLastSaved()
      get().pushHistory('Toggle Schedule')
    }
  },

  setWebhookStatus: (hasActiveWebhook) => {
    if (get().hasActiveWebhook !== hasActiveWebhook) {
      if (get().hasActiveSchedule) {
        get().setScheduleStatus(false)
      }
      set({ hasActiveWebhook })
      get().updateLastSaved()
      get().pushHistory('Toggle Webhook')
    }
  },

  toggleBlockAdvancedMode: (id) => {
    // This might be a UI-only state, if so, it doesn't need to be persisted
    // For now, we'll log a warning and push to history
    console.warn('toggleBlockAdvancedMode is not persisted to the database.')
    get().pushHistory(`Toggle advanced mode on block ${id}`)
  },

  updateParallelCount: async (parallelId, count) => {
    const workerId = useWorkerRegistry.getState().activeWorkerId
    if (!workerId) return

    const block = get().blocks[parallelId]
    if (!block || block.type !== 'parallel') return

    const updatedBlock = {
      ...block,
      data: { ...block.data, count: Math.max(1, Math.min(50, count)) },
    }
    set((state) => ({ blocks: { ...state.blocks, [parallelId]: updatedBlock } }))
    await get()._saveBlockToDatabase(workerId, updatedBlock)
    get().pushHistory(`Update parallel count for ${updatedBlock.name}`)
  },

  updateParallelCollection: async (parallelId, collection) => {
    const workerId = useWorkerRegistry.getState().activeWorkerId
    if (!workerId) return

    const block = get().blocks[parallelId]
    if (!block || block.type !== 'parallel') return

    const updatedBlock = { ...block, data: { ...block.data, collection } }
    set((state) => ({ blocks: { ...state.blocks, [parallelId]: updatedBlock } }))
    await get()._saveBlockToDatabase(workerId, updatedBlock)
    get().pushHistory(`Update parallel collection for ${updatedBlock.name}`)
  },
}))

// Helper function to remove a sub-block from the sub-block store
export const removeSubBlock = (workerId: string, blockId: string) => {
  const subBlockStore = useSubBlockStore.getState()
  if (subBlockStore.workerValues?.[workerId]) {
    const workerValues = { ...subBlockStore.workerValues[workerId] }
    delete workerValues[blockId]
    useSubBlockStore.setState((state) => ({
      workerValues: {
        ...state.workerValues,
        [workerId]: workerValues,
      },
    }))
  }
}
