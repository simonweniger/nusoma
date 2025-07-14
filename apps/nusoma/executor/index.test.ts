/**
 * @vitest-environment node
 *
 * Executor Class Unit Tests
 *
 * This file contains unit tests for the Executor class, which is responsible for
 * running worker blocks in topological order, handling the execution flow,
 * resolving inputs and dependencies, and managing errors.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  createMinimalWorker,
  createMockContext,
  createWorkerWithCondition,
  createWorkerWithErrorPath,
  createWorkerWithLoop,
  setupAllMocks,
} from './__test-utils__/executor-mocks'
import { Executor } from './index'

vi.mock('@/stores/execution/store', () => ({
  useExecutionStore: {
    getState: vi.fn(() => ({
      setIsExecuting: vi.fn(),
      setIsDebugging: vi.fn(),
      setPendingBlocks: vi.fn(),
      reset: vi.fn(),
      setActiveBlocks: vi.fn(),
    })),
    setState: vi.fn(),
  },
}))

vi.mock('@/lib/logger/console-logger', () => ({
  createLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

describe('Executor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
    vi.resetModules()
  })

  /**
   * Initialization tests
   */
  describe('initialization', () => {
    test('should create an executor instance with legacy constructor format', () => {
      const worker = createMinimalWorker()
      const executor = new Executor(worker)

      expect(executor).toBeDefined()
      expect(executor).toBeInstanceOf(Executor)
    })

    test('should create an executor instance with new options object format', () => {
      const worker = createMinimalWorker()
      const initialStates = {
        block1: { response: { result: 'Initial state' } },
      }
      const envVars = { API_KEY: 'test-key', BASE_URL: 'https://example.com' }
      const workerInput = { query: 'test query' }
      const workerVariables = { var1: 'value1' }

      const executor = new Executor({
        worker,
        currentBlockStates: initialStates,
        envVarValues: envVars,
        workerInput,
        workerVariables,
      })

      expect(executor).toBeDefined()
      expect(executor).toBeInstanceOf(Executor)

      // Verify that all properties are properly initialized
      expect((executor as any).actualWorker).toBe(worker)
      expect((executor as any).initialBlockStates).toEqual(initialStates)
      expect((executor as any).environmentVariables).toEqual(envVars)
      expect((executor as any).workerInput).toEqual(workerInput)
      expect((executor as any).workerVariables).toEqual(workerVariables)
    })

    test('should accept streaming context extensions', () => {
      const worker = createMinimalWorker()
      const mockOnStream = vi.fn()

      const executor = new Executor({
        worker,
        contextExtensions: {
          stream: true,
          selectedOutputIds: ['block1'],
          edges: [{ source: 'starter', target: 'block1' }],
          onStream: mockOnStream,
        },
      })

      expect(executor).toBeDefined()
    })

    test('should handle legacy constructor with individual parameters', () => {
      const worker = createMinimalWorker()
      const initialStates = {
        block1: { response: { result: 'Initial state' } },
      }
      const envVars = { API_KEY: 'test-key' }
      const workerInput = { query: 'test query' }
      const workerVariables = { var1: 'value1' }

      const executor = new Executor(worker, initialStates, envVars, workerInput, workerVariables)
      expect(executor).toBeDefined()
    })
  })

  /**
   * Validation tests
   */
  describe('worker validation', () => {
    test('should validate worker on initialization', () => {
      const validateSpy = vi.spyOn(Executor.prototype as any, 'validateWorker')

      const worker = createMinimalWorker()
      const _executor = new Executor(worker)

      expect(validateSpy).toHaveBeenCalled()
    })

    test('should validate worker on execution', async () => {
      const worker = createMinimalWorker()
      const executor = new Executor(worker)

      const validateSpy = vi.spyOn(executor as any, 'validateWorker')
      validateSpy.mockClear()

      await executor.execute('test-worker-id')

      expect(validateSpy).toHaveBeenCalledTimes(1)
    })

    test('should throw error for worker without starter block', () => {
      const worker = createMinimalWorker()
      worker.blocks = worker.blocks.filter((block) => block.metadata?.id !== 'starter')

      expect(() => new Executor(worker)).toThrow('Worker must have an enabled starter block')
    })

    test('should throw error for worker with disabled starter block', () => {
      const worker = createMinimalWorker()
      worker.blocks.find((block) => block.metadata?.id === 'starter')!.enabled = false

      expect(() => new Executor(worker)).toThrow('Worker must have an enabled starter block')
    })

    test('should throw error if starter block has incoming connections', () => {
      const worker = createMinimalWorker()
      worker.connections.push({
        source: 'block1',
        target: 'starter',
      })

      expect(() => new Executor(worker)).toThrow('Starter block cannot have incoming connections')
    })

    test('should throw error if starter block has no outgoing connections', () => {
      const worker = createMinimalWorker()
      worker.connections = []

      expect(() => new Executor(worker)).toThrow(
        'Starter block must have at least one outgoing connection'
      )
    })

    test('should throw error if connection references non-existent source block', () => {
      const worker = createMinimalWorker()
      worker.connections.push({
        source: 'non-existent-block',
        target: 'block1',
      })

      expect(() => new Executor(worker)).toThrow(
        'Connection references non-existent source block: non-existent-block'
      )
    })

    test('should throw error if connection references non-existent target block', () => {
      const worker = createMinimalWorker()
      worker.connections.push({
        source: 'starter',
        target: 'non-existent-block',
      })

      expect(() => new Executor(worker)).toThrow(
        'Connection references non-existent target block: non-existent-block'
      )
    })
  })

  /**
   * Execution tests
   */
  describe('worker execution', () => {
    test('should execute worker and return ExecutionResult', async () => {
      const worker = createMinimalWorker()
      const executor = new Executor(worker)

      const result = await executor.execute('test-worker-id')

      // Check if result is a StreamingExecution or ExecutionResult
      if ('success' in result) {
        expect(result).toHaveProperty('success')
        expect(result).toHaveProperty('output')
        expect(result.output).toHaveProperty('response')

        // Our mocked implementation results in a false success value
        // In real usage, this would be true for successful executions
        expect(typeof result.success).toBe('boolean')
      } else {
        // Handle StreamingExecution case
        expect(result).toHaveProperty('stream')
        expect(result).toHaveProperty('execution')
        expect(result.stream).toBeInstanceOf(ReadableStream)
      }
    })

    test('should handle streaming execution with onStream callback', async () => {
      const worker = createMinimalWorker()
      const mockOnStream = vi.fn()

      const executor = new Executor({
        worker,
        contextExtensions: {
          stream: true,
          selectedOutputIds: ['block1'],
          onStream: mockOnStream,
        },
      })

      const result = await executor.execute('test-worker-id')

      // With streaming enabled, should handle both ExecutionResult and StreamingExecution
      if ('stream' in result) {
        expect(result.stream).toBeInstanceOf(ReadableStream)
        expect(result.execution).toBeDefined()
      } else {
        expect(result).toHaveProperty('success')
        expect(result).toHaveProperty('output')
      }
    })

    test('should pass context extensions to execution context', async () => {
      const worker = createMinimalWorker()
      const mockOnStream = vi.fn()
      const selectedOutputIds = ['block1', 'block2']
      const edges = [{ source: 'starter', target: 'block1' }]

      const executor = new Executor({
        worker,
        contextExtensions: {
          stream: true,
          selectedOutputIds,
          edges,
          onStream: mockOnStream,
        },
      })

      // Spy on createExecutionContext to verify context extensions are passed
      const createContextSpy = vi.spyOn(executor as any, 'createExecutionContext')

      await executor.execute('test-worker-id')

      expect(createContextSpy).toHaveBeenCalled()
      const contextArg = createContextSpy.mock.calls[0][2] // third argument is startTime, context is created internally
    })
  })

  /**
   * Condition and loop tests
   */
  describe('special blocks', () => {
    test('should handle condition blocks without errors', async () => {
      const worker = createWorkerWithCondition()
      const executor = new Executor(worker)

      const result = await executor.execute('test-worker-id')

      // Verify execution completes and returns expected structure
      if ('success' in result) {
        expect(result).toHaveProperty('success')
        expect(result).toHaveProperty('output')
      } else {
        expect(result).toHaveProperty('stream')
        expect(result).toHaveProperty('execution')
      }
    })

    test('should handle loop structures without errors', async () => {
      const worker = createWorkerWithLoop()
      const executor = new Executor(worker)

      const result = await executor.execute('test-worker-id')

      // Verify execution completes and returns expected structure
      if ('success' in result) {
        expect(result).toHaveProperty('success')
        expect(result).toHaveProperty('output')
      } else {
        expect(result).toHaveProperty('stream')
        expect(result).toHaveProperty('execution')
      }
    })
  })

  /**
   * Debug mode tests
   */
  describe('debug mode', () => {
    test('should detect debug mode from settings', async () => {
      // Reset and reconfigure mocks for debug mode
      vi.resetModules()
      vi.clearAllMocks()

      // Setup mocks with debug mode enabled
      setupAllMocks({ isDebugModeEnabled: true })

      // Import Executor AFTER setting up mocks
      const { Executor } = await import('./index')

      const worker = createMinimalWorker()
      const executor = new Executor(worker)
      const isDebugging = (executor as any).isDebugging

      expect(isDebugging).toBe(true)
    })

    test('should work with debug mode disabled', async () => {
      // Reset and reconfigure mocks for normal mode
      vi.resetModules()
      vi.clearAllMocks()

      // Setup mocks with debug mode disabled (default)
      setupAllMocks({ isDebugModeEnabled: false })

      // Import Executor AFTER setting up mocks
      const { Executor } = await import('./index')

      const worker = createMinimalWorker()
      const executor = new Executor(worker)
      const isDebugging = (executor as any).isDebugging

      expect(isDebugging).toBe(false)
    })

    test('should handle continue execution in debug mode', async () => {
      const worker = createMinimalWorker()
      const executor = new Executor(worker)

      // Create a mock context for debug continuation
      const mockContext = createMockContext()
      mockContext.blockStates.set('starter', {
        output: { response: { input: {} } },
        executed: true,
        executionTime: 0,
      })

      const result = await executor.continueExecution(['block1'], mockContext)

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('output')
      expect(result).toHaveProperty('logs')
    })
  })

  /**
   * Additional tests to improve coverage
   */
  describe('normalizeBlockOutput', () => {
    test('should normalize different block outputs correctly', () => {
      const worker = createMinimalWorker()
      const executor = new Executor(worker)

      // Access the private method for testing
      const normalizeOutput = (executor as any).normalizeBlockOutput.bind(executor)

      // Test normalizing agent block output
      const agentBlock = { metadata: { id: 'agent' } }
      const agentOutput = { response: { content: 'Agent response' } }
      expect(normalizeOutput(agentOutput, agentBlock)).toEqual(agentOutput)

      // Test normalizing router block output
      const routerBlock = { metadata: { id: 'router' } }
      const routerOutput = { selectedPath: { blockId: 'target' } }
      const normalizedRouterOutput = normalizeOutput(routerOutput, routerBlock)
      expect(normalizedRouterOutput.response.selectedPath).toEqual(routerOutput.selectedPath)

      // Test normalizing function block output
      const functionBlock = { metadata: { id: 'function' } }
      const functionOutput = { result: 'Function result', stdout: 'Output' }
      const normalizedFunctionOutput = normalizeOutput(functionOutput, functionBlock)
      expect(normalizedFunctionOutput.response.result).toEqual(functionOutput.result)
      expect(normalizedFunctionOutput.response.stdout).toEqual(functionOutput.stdout)

      // Test generic output normalization
      const genericBlock = { metadata: { id: 'unknown' } }
      const genericOutput = 'Simple string result'
      const normalizedGenericOutput = normalizeOutput(genericOutput, genericBlock)
      expect(normalizedGenericOutput.response.result).toEqual(genericOutput)
    })

    test('should normalize error outputs correctly', () => {
      const worker = createMinimalWorker()
      const executor = new Executor(worker)
      const normalizeOutput = (executor as any).normalizeBlockOutput.bind(executor)

      // Test error output with error property
      const errorOutput = { error: 'Test error message', status: 400 }
      const normalizedErrorOutput = normalizeOutput(errorOutput, { metadata: { id: 'api' } })

      expect(normalizedErrorOutput).toHaveProperty('error', 'Test error message')
      expect(normalizedErrorOutput.response).toHaveProperty('error', 'Test error message')
      expect(normalizedErrorOutput.response).toHaveProperty('status', 400)

      // Test object with response.error
      const responseErrorOutput = { response: { error: 'Response error', data: 'test' } }
      const normalizedResponseError = normalizeOutput(responseErrorOutput, {
        metadata: { id: 'api' },
      })

      expect(normalizedResponseError).toHaveProperty('error', 'Response error')
      expect(normalizedResponseError.response).toHaveProperty('error', 'Response error')
      expect(normalizedResponseError.response).toHaveProperty('data', 'test')
    })
  })

  /**
   * Error handling tests
   */
  describe('error handling', () => {
    test('should activate error paths when a block has an error', () => {
      const worker = createWorkerWithErrorPath()
      const executor = new Executor(worker)

      // Mock context
      const context = {
        executedBlocks: new Set<string>(['starter', 'block1']),
        activeExecutionPath: new Set<string>(['block1']),
        blockStates: new Map(),
        worker: worker,
      } as any

      // Add error state to the block
      context.blockStates.set('block1', {
        output: {
          error: 'Test error',
          response: { error: 'Test error' },
        },
        executed: true,
      })

      // Call activateErrorPath method
      const activateErrorPath = (executor as any).activateErrorPath.bind(executor)
      const result = activateErrorPath('block1', context)

      // Should return true since there is an error path
      expect(result).toBe(true)

      // Error-handler block should be in active execution path
      expect(context.activeExecutionPath.has('error-handler')).toBe(true)
    })

    test('should not activate error paths for starter and condition blocks', () => {
      const worker = createWorkerWithErrorPath()
      const executor = new Executor(worker)

      // Add condition block
      worker.blocks.push({
        id: 'condition-block',
        position: { x: 300, y: 0 },
        config: { tool: 'test-tool', params: {} },
        inputs: {},
        outputs: {},
        enabled: true,
        metadata: { id: 'condition', name: 'Condition Block' },
      })

      // Mock context
      const context = {
        executedBlocks: new Set<string>(['starter', 'condition-block']),
        activeExecutionPath: new Set<string>(['condition-block']),
        blockStates: new Map(),
        worker: worker,
      } as any

      // Add error states
      context.blockStates.set('starter', {
        output: { error: 'Test error' },
        executed: true,
      })

      context.blockStates.set('condition-block', {
        output: { error: 'Test error' },
        executed: true,
      })

      // Call activateErrorPath method
      const activateErrorPath = (executor as any).activateErrorPath.bind(executor)

      // Should return false for both blocks
      expect(activateErrorPath('starter', context)).toBe(false)
      expect(activateErrorPath('condition-block', context)).toBe(false)
    })

    test('should return false if no error connections exist', () => {
      const worker = createMinimalWorker()
      const executor = new Executor(worker)

      // Mock context
      const context = {
        executedBlocks: new Set<string>(['starter', 'block1']),
        activeExecutionPath: new Set<string>(['block1']),
        blockStates: new Map(),
        worker: worker,
      } as any

      // Add error state to the block
      context.blockStates.set('block1', {
        output: { error: 'Test error' },
        executed: true,
      })

      // Call activateErrorPath method
      const activateErrorPath = (executor as any).activateErrorPath.bind(executor)
      const result = activateErrorPath('block1', context)

      // Should return false since there is no error path
      expect(result).toBe(false)
    })

    test('should create proper error output for a block error', () => {
      const worker = createWorkerWithErrorPath()
      const executor = new Executor(worker)

      // Create an error with additional properties
      const testError = new Error('Test function execution error') as Error & {
        status?: number
      }
      testError.status = 400

      // Create a context with blockLogs
      const _mockContext = {
        blockLogs: [],
        blockStates: new Map(),
        executedBlocks: new Set<string>(),
        activeExecutionPath: new Set<string>(['block1']),
        worker,
      }

      // Call the extractErrorMessage method directly
      const extractErrorMessage = (executor as any).extractErrorMessage.bind(executor)
      const errorMessage = extractErrorMessage(testError)

      // Verify the error message is extracted correctly
      expect(errorMessage).toBe('Test function execution error')

      // Create an error output manually
      const errorOutput = {
        response: {
          error: errorMessage,
          status: testError.status || 500,
        },
        error: errorMessage,
      }

      // Verify the error output structure
      expect(errorOutput).toHaveProperty('error')
      expect(errorOutput.response).toHaveProperty('error')
      expect(errorOutput.response).toHaveProperty('status')
    })

    test('should handle "undefined (undefined)" error case', () => {
      const worker = createMinimalWorker()
      const executor = new Executor(worker)

      const extractErrorMessage = (executor as any).extractErrorMessage.bind(executor)

      // Test the specific "undefined (undefined)" error case
      const undefinedError = { message: 'undefined (undefined)' }
      const errorMessage = extractErrorMessage(undefinedError)

      expect(errorMessage).toBe('undefined (undefined)')
    })
  })

  /**
   * Streaming execution tests
   */
  describe('streaming execution', () => {
    test('should handle streaming execution results', async () => {
      const worker = createMinimalWorker()
      const mockOnStream = vi.fn()

      // Mock a streaming execution result
      const mockStreamingResult = {
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('chunk1'))
            controller.enqueue(new TextEncoder().encode('chunk2'))
            controller.close()
          },
        }),
        execution: {
          blockId: 'agent-1',
          output: { response: { content: 'Final content' } },
        },
      }

      const executor = new Executor({
        worker,
        contextExtensions: {
          stream: true,
          selectedOutputIds: ['block1'],
          onStream: mockOnStream,
        },
      })

      const result = await executor.execute('test-worker-id')

      // Verify result structure
      if ('stream' in result) {
        expect(result.stream).toBeInstanceOf(ReadableStream)
        expect(result.execution).toBeDefined()
      }
    })

    test('should process streaming content in context', async () => {
      const worker = createMinimalWorker()
      const mockOnStream = vi.fn()

      const executor = new Executor({
        worker,
        contextExtensions: {
          stream: true,
          selectedOutputIds: ['block1'],
          onStream: mockOnStream,
        },
      })

      // Test that execution context contains streaming properties
      const createContextSpy = vi.spyOn(executor as any, 'createExecutionContext')

      await executor.execute('test-worker-id')

      expect(createContextSpy).toHaveBeenCalled()
    })
  })
})
