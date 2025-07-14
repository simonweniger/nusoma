import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import type { SerializedBlock } from '@/serializer/types'
import type { ExecutionContext } from '../../types'
import { WorkerBlockHandler } from './worker-handler'

// Mock fetch globally
global.fetch = vi.fn()

describe('WorkerBlockHandler', () => {
  let handler: WorkerBlockHandler
  let mockBlock: SerializedBlock
  let mockContext: ExecutionContext
  let mockFetch: Mock

  beforeEach(() => {
    handler = new WorkerBlockHandler()
    mockFetch = global.fetch as Mock

    mockBlock = {
      id: 'worker-block-1',
      metadata: { id: 'worker', name: 'Test Worker Block' },
      position: { x: 0, y: 0 },
      config: { tool: 'worker', params: {} },
      inputs: { workerId: 'string' },
      outputs: {},
      enabled: true,
    }

    mockContext = {
      workerId: 'parent-worker-id',
      blockStates: new Map(),
      blockLogs: [],
      metadata: { duration: 0 },
      environmentVariables: {},
      decisions: { router: new Map(), condition: new Map() },
      loopIterations: new Map(),
      loopItems: new Map(),
      executedBlocks: new Set(),
      activeExecutionPath: new Set(),
      completedLoops: new Set(),
      worker: {
        version: '1.0',
        blocks: [],
        connections: [],
        loops: {},
      },
    }

    // Reset all mocks
    vi.clearAllMocks()

    // Clear the static execution stack
    ;(WorkerBlockHandler as any).executionStack.clear()

    // Setup default fetch mock
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            name: 'Child Worker',
            state: {
              blocks: [
                {
                  id: 'starter',
                  metadata: { id: 'starter', name: 'Starter' },
                  position: { x: 0, y: 0 },
                  config: { tool: 'starter', params: {} },
                  inputs: {},
                  outputs: {},
                  enabled: true,
                },
              ],
              edges: [],
              loops: {},
              parallels: {},
            },
          },
        }),
    })
  })

  describe('canHandle', () => {
    it('should handle worker blocks', () => {
      expect(handler.canHandle(mockBlock)).toBe(true)
    })

    it('should not handle non-worker blocks', () => {
      const nonWorkerBlock = { ...mockBlock, metadata: { id: 'function' } }
      expect(handler.canHandle(nonWorkerBlock)).toBe(false)
    })
  })

  describe('execute', () => {
    it('should throw error when no workerId is provided', async () => {
      const inputs = {}

      await expect(handler.execute(mockBlock, inputs, mockContext)).rejects.toThrow(
        'No worker selected for execution'
      )
    })

    it('should detect and prevent cyclic dependencies', async () => {
      const inputs = { workerId: 'child-worker-id' }

      // Simulate a cycle by adding the execution to the stack
      ;(WorkerBlockHandler as any).executionStack.add('parent-worker-id_sub_child-worker-id')

      const result = await handler.execute(mockBlock, inputs, mockContext)

      expect(result).toEqual({
        success: false,
        error: 'Cyclic worker dependency detected: parent-worker-id_sub_child-worker-id',
        childWorkerName: 'child-worker-id',
      })
    })

    it('should enforce maximum depth limit', async () => {
      const inputs = { workerId: 'child-worker-id' }

      // Create a deeply nested context (simulate 11 levels deep to exceed the limit of 10)
      const deepContext = {
        ...mockContext,
        workerId:
          'level1_sub_level2_sub_level3_sub_level4_sub_level5_sub_level6_sub_level7_sub_level8_sub_level9_sub_level10_sub_level11',
      }

      const result = await handler.execute(mockBlock, inputs, deepContext)

      expect(result).toEqual({
        success: false,
        error: 'Maximum worker nesting depth of 10 exceeded',
        childWorkerName: 'child-worker-id',
      })
    })

    it('should handle child worker not found', async () => {
      const inputs = { workerId: 'non-existent-worker' }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      const result = await handler.execute(mockBlock, inputs, mockContext)

      expect(result).toEqual({
        success: false,
        error: 'Child worker non-existent-worker not found',
        childWorkerName: 'non-existent-worker',
      })
    })

    it('should handle fetch errors gracefully', async () => {
      const inputs = { workerId: 'child-worker-id' }

      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await handler.execute(mockBlock, inputs, mockContext)

      expect(result).toEqual({
        success: false,
        error: 'Child worker child-worker-id not found',
        childWorkerName: 'child-worker-id',
      })
    })
  })

  describe('loadChildWorker', () => {
    it('should return null for 404 responses', async () => {
      const workerId = 'non-existent-worker'

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      const result = await (handler as any).loadChildWorker(workerId)

      expect(result).toBeNull()
    })

    it('should handle invalid worker state', async () => {
      const workerId = 'invalid-worker'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              name: 'Invalid Worker',
              state: null, // Invalid state
            },
          }),
      })

      const result = await (handler as any).loadChildWorker(workerId)

      expect(result).toBeNull()
    })
  })

  describe('mapChildOutputToParent', () => {
    it('should map successful child output correctly', () => {
      const childResult = {
        success: true,
        output: { response: { data: 'test result' } },
      }

      const result = (handler as any).mapChildOutputToParent(
        childResult,
        'child-id',
        'Child Worker',
        100
      )

      expect(result).toEqual({
        response: {
          success: true,
          childWorkerName: 'Child Worker',
          result: { data: 'test result' },
        },
      })
    })

    it('should map failed child output correctly', () => {
      const childResult = {
        success: false,
        error: 'Child worker failed',
      }

      const result = (handler as any).mapChildOutputToParent(
        childResult,
        'child-id',
        'Child Worker',
        100
      )

      expect(result).toEqual({
        response: {
          success: false,
          childWorkerName: 'Child Worker',
          error: 'Child worker failed',
        },
      })
    })

    it('should handle nested response structures', () => {
      const childResult = {
        response: { response: { nested: 'data' } },
      }

      const result = (handler as any).mapChildOutputToParent(
        childResult,
        'child-id',
        'Child Worker',
        100
      )

      expect(result).toEqual({
        response: {
          success: true,
          childWorkerName: 'Child Worker',
          result: { nested: 'data' },
        },
      })
    })
  })
})
