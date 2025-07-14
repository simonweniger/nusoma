import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWorkerRegistry } from '../registry/store'
import { useSubBlockStore } from '../subblock/store'
import { useWorkerStore } from './store'

// Mock Supabase before importing
vi.mock('@nusoma/database/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          limit: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        limit: vi.fn().mockResolvedValue({ data: null, error: null }),
        order: vi.fn().mockReturnThis(),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockResolvedValue('ok'),
      unsubscribe: vi.fn().mockResolvedValue('ok'),
      send: vi.fn(),
    }),
    removeChannel: vi.fn(),
  },
}))

describe('worker store', () => {
  beforeEach(() => {
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    }
    global.localStorage = localStorageMock as any

    useWorkerStore.setState({
      blocks: {},
      edges: [],
      loops: {},
      parallels: {},
    })
  })

  describe('loop management', () => {
    it('should regenerate loops when updateLoopCount is called', () => {
      const { addBlock, updateLoopCount } = useWorkerStore.getState()

      // Add a loop block
      addBlock(
        'loop1',
        'loop',
        'Test Loop',
        { x: 0, y: 0 },
        {
          loopType: 'for',
          count: 5,
          collection: '',
        }
      )

      // Update loop count
      updateLoopCount('loop1', 10)

      const state = useWorkerStore.getState()

      // Check that block data was updated
      expect(state.blocks.loop1?.data?.count).toBe(10)

      // Check that loops were regenerated
      expect(state.loops.loop1).toBeDefined()
      expect(state.loops.loop1.iterations).toBe(10)
    })

    it('should regenerate loops when updateLoopType is called', () => {
      const { addBlock, updateLoopType } = useWorkerStore.getState()

      // Add a loop block
      addBlock(
        'loop1',
        'loop',
        'Test Loop',
        { x: 0, y: 0 },
        {
          loopType: 'for',
          count: 5,
          collection: '["a", "b", "c"]',
        }
      )

      // Update loop type
      updateLoopType('loop1', 'forEach')

      const state = useWorkerStore.getState()

      // Check that block data was updated
      expect(state.blocks.loop1?.data?.loopType).toBe('forEach')

      // Check that loops were regenerated with forEach items
      expect(state.loops.loop1).toBeDefined()
      expect(state.loops.loop1.loopType).toBe('forEach')
      expect(state.loops.loop1.forEachItems).toEqual(['a', 'b', 'c'])
    })

    it('should regenerate loops when updateLoopCollection is called', () => {
      const { addBlock, updateLoopCollection } = useWorkerStore.getState()

      // Add a forEach loop block
      addBlock(
        'loop1',
        'loop',
        'Test Loop',
        { x: 0, y: 0 },
        {
          loopType: 'forEach',
          collection: '["item1", "item2"]',
        }
      )

      // Update loop collection
      updateLoopCollection('loop1', '["item1", "item2", "item3"]')

      const state = useWorkerStore.getState()

      // Check that block data was updated
      expect(state.blocks.loop1?.data?.collection).toBe('["item1", "item2", "item3"]')

      // Check that loops were regenerated with new items
      expect(state.loops.loop1).toBeDefined()
      expect(state.loops.loop1.forEachItems).toEqual(['item1', 'item2', 'item3'])
    })

    it('should clamp loop count between 1 and 50', () => {
      const { addBlock, updateLoopCount } = useWorkerStore.getState()

      // Add a loop block
      addBlock(
        'loop1',
        'loop',
        'Test Loop',
        { x: 0, y: 0 },
        {
          loopType: 'for',
          count: 5,
          collection: '',
        }
      )

      // Try to set count above max
      updateLoopCount('loop1', 100)
      let state = useWorkerStore.getState()
      expect(state.blocks.loop1?.data?.count).toBe(50)

      // Try to set count below min
      updateLoopCount('loop1', 0)
      state = useWorkerStore.getState()
      expect(state.blocks.loop1?.data?.count).toBe(1)
    })
  })

  describe('parallel management', () => {
    it('should regenerate parallels when updateParallelCount is called', () => {
      const { addBlock, updateParallelCount } = useWorkerStore.getState()

      // Add a parallel block
      addBlock(
        'parallel1',
        'parallel',
        'Test Parallel',
        { x: 0, y: 0 },
        {
          count: 3,
          collection: '',
        }
      )

      // Update parallel count
      updateParallelCount('parallel1', 5)

      const state = useWorkerStore.getState()

      // Check that block data was updated
      expect(state.blocks.parallel1?.data?.count).toBe(5)

      // Check that parallels were regenerated
      expect(state.parallels.parallel1).toBeDefined()
      expect(state.parallels.parallel1.distribution).toBe('')
    })

    it('should regenerate parallels when updateParallelCollection is called', () => {
      const { addBlock, updateParallelCollection } = useWorkerStore.getState()

      // Add a parallel block
      addBlock(
        'parallel1',
        'parallel',
        'Test Parallel',
        { x: 0, y: 0 },
        {
          count: 3,
          collection: '["item1", "item2"]',
        }
      )

      // Update parallel collection
      updateParallelCollection('parallel1', '["item1", "item2", "item3"]')

      const state = useWorkerStore.getState()

      // Check that block data was updated
      expect(state.blocks.parallel1?.data?.collection).toBe('["item1", "item2", "item3"]')

      // Check that parallels were regenerated
      expect(state.parallels.parallel1).toBeDefined()
      expect(state.parallels.parallel1.distribution).toBe('["item1", "item2", "item3"]')

      // Verify that the parallel count matches the collection size
      const parsedDistribution = JSON.parse(state.parallels.parallel1.distribution as string)
      expect(parsedDistribution).toHaveLength(3)
    })

    it('should clamp parallel count between 1 and 50', () => {
      const { addBlock, updateParallelCount } = useWorkerStore.getState()

      // Add a parallel block
      addBlock(
        'parallel1',
        'parallel',
        'Test Parallel',
        { x: 0, y: 0 },
        {
          count: 5,
          collection: '',
        }
      )

      // Try to set count above max
      updateParallelCount('parallel1', 100)
      let state = useWorkerStore.getState()
      expect(state.blocks.parallel1?.data?.count).toBe(50)

      // Try to set count below min
      updateParallelCount('parallel1', 0)
      state = useWorkerStore.getState()
      expect(state.blocks.parallel1?.data?.count).toBe(1)
    })

    it('should save to history when updating parallel properties', () => {
      const { addBlock, updateParallelCollection, updateParallelCount } = useWorkerStore.getState()

      // Add a parallel block
      addBlock(
        'parallel1',
        'parallel',
        'Test Parallel',
        { x: 0, y: 0 },
        {
          count: 3,
          collection: '',
        }
      )

      // Get initial history length
      const initialHistoryLength = useWorkerStore.getState().history.past.length

      // Update collection
      updateParallelCollection('parallel1', '["a", "b", "c"]')

      let state = useWorkerStore.getState()
      expect(state.history.past.length).toBe(initialHistoryLength + 1)

      // Update count
      updateParallelCount('parallel1', 5)

      state = useWorkerStore.getState()
      expect(state.history.past.length).toBe(initialHistoryLength + 2)
    })
  })

  describe('mode switching', () => {
    it('should toggle advanced mode on a block', () => {
      const { addBlock, toggleBlockAdvancedMode } = useWorkerStore.getState()

      // Add an agent block
      addBlock('agent1', 'agent', 'Test Agent', { x: 0, y: 0 })

      // Initially should be in basic mode (advancedMode: false or undefined)
      let state = useWorkerStore.getState()
      expect(state.blocks.agent1?.advancedMode).toBeUndefined()

      // Toggle to advanced mode
      toggleBlockAdvancedMode('agent1')
      state = useWorkerStore.getState()
      expect(state.blocks.agent1?.advancedMode).toBe(true)

      // Toggle back to basic mode
      toggleBlockAdvancedMode('agent1')
      state = useWorkerStore.getState()
      expect(state.blocks.agent1?.advancedMode).toBe(false)
    })

    it('should preserve systemPrompt and userPrompt when switching modes', () => {
      const { addBlock, toggleBlockAdvancedMode } = useWorkerStore.getState()
      const { setState: setSubBlockState } = useSubBlockStore
      // Set up a mock active worker
      useWorkerRegistry.setState({ activeWorkerId: 'test-worker' })
      // Add an agent block
      addBlock('agent1', 'agent', 'Test Agent', { x: 0, y: 0 })
      // Set initial values in basic mode
      setSubBlockState({
        workerValues: {
          'test-worker': {
            agent1: {
              systemPrompt: 'You are a helpful assistant',
              userPrompt: 'Hello, how are you?',
            },
          },
        },
      })
      // Toggle to advanced mode
      toggleBlockAdvancedMode('agent1')
      // Check that prompts are preserved in advanced mode
      let subBlockState = useSubBlockStore.getState()
      expect(subBlockState.workerValues['test-worker'].agent1.systemPrompt).toBe(
        'You are a helpful assistant'
      )
      expect(subBlockState.workerValues['test-worker'].agent1.userPrompt).toBe(
        'Hello, how are you?'
      )
      // Toggle back to basic mode
      toggleBlockAdvancedMode('agent1')
      // Check that prompts are still preserved
      subBlockState = useSubBlockStore.getState()
      expect(subBlockState.workerValues['test-worker'].agent1.systemPrompt).toBe(
        'You are a helpful assistant'
      )
      expect(subBlockState.workerValues['test-worker'].agent1.userPrompt).toBe(
        'Hello, how are you?'
      )
    })

    it('should clear memories when switching from advanced to basic mode', () => {
      const { addBlock, toggleBlockAdvancedMode } = useWorkerStore.getState()
      const { setState: setSubBlockState } = useSubBlockStore

      // Set up a mock active worker
      useWorkerRegistry.setState({ activeWorkerId: 'test-worker' })

      // Add an agent block in advanced mode
      addBlock('agent1', 'agent', 'Test Agent', { x: 0, y: 0 })

      // First toggle to advanced mode
      toggleBlockAdvancedMode('agent1')

      // Set values including memories
      setSubBlockState({
        workerValues: {
          'test-worker': {
            agent1: {
              systemPrompt: 'You are a helpful assistant',
              userPrompt: 'What did we discuss?',
              memories: [
                { role: 'user', content: 'My name is John' },
                { role: 'assistant', content: 'Nice to meet you, John!' },
              ],
            },
          },
        },
      })

      // Toggle back to basic mode
      toggleBlockAdvancedMode('agent1')

      // Check that prompts are preserved but memories are cleared
      const subBlockState = useSubBlockStore.getState()
      expect(subBlockState.workerValues['test-worker'].agent1.systemPrompt).toBe(
        'You are a helpful assistant'
      )
      expect(subBlockState.workerValues['test-worker'].agent1.userPrompt).toBe(
        'What did we discuss?'
      )
      expect(subBlockState.workerValues['test-worker'].agent1.memories).toBeNull()
    })

    it('should handle mode switching when no subblock values exist', () => {
      const { addBlock, toggleBlockAdvancedMode } = useWorkerStore.getState()

      // Set up a mock active worker
      useWorkerRegistry.setState({ activeWorkerId: 'test-worker' })

      // Add an agent block
      addBlock('agent1', 'agent', 'Test Agent', { x: 0, y: 0 })

      // Toggle modes without any subblock values set
      expect(useWorkerStore.getState().blocks.agent1?.advancedMode).toBeUndefined()
      expect(() => toggleBlockAdvancedMode('agent1')).not.toThrow()

      // Verify the mode changed
      const state = useWorkerStore.getState()
      expect(state.blocks.agent1?.advancedMode).toBe(true)
    })

    it('should not throw when toggling non-existent block', () => {
      const { toggleBlockAdvancedMode } = useWorkerStore.getState()

      // Try to toggle a block that doesn't exist
      expect(() => toggleBlockAdvancedMode('non-existent')).not.toThrow()
    })
  })
})
