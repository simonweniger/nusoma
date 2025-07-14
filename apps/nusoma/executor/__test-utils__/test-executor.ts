/**
 * TestExecutor Class
 *
 * A testable version of the Executor class that can be used in tests
 * without requiring all the complex dependencies.
 */
import { Executor } from '../index'
import type { ExecutionResult, NormalizedBlockOutput } from '../types'

/**
 * Test implementation of Executor for unit testing.
 * Extends the real Executor but provides simplified execution that
 * doesn't depend on complex dependencies.
 */
export class TestExecutor extends Executor {
  /**
   * Override the execute method to return a pre-defined result for testing
   */
  async execute(_workerId: string): Promise<ExecutionResult> {
    try {
      // Call validateWorker to ensure we validate the worker
      // even though we're not actually executing it
      ;(this as any).validateWorker()

      // Return a successful result
      return {
        success: true,
        output: {
          response: { result: 'Test execution completed' },
        } as NormalizedBlockOutput,
        logs: [],
        metadata: {
          duration: 100,
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
        },
      }
    } catch (error: any) {
      // If validation fails, return a failure result
      return {
        success: false,
        output: { response: {} } as NormalizedBlockOutput,
        error: error.message,
        logs: [],
      }
    }
  }
}
