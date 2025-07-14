/**
 * Variable types supported in the application
 * Note: 'string' is deprecated - use 'plain' for text values instead
 */
export type VariableType = 'plain' | 'number' | 'boolean' | 'object' | 'array' | 'string'

/**
 * Represents a worker variable with worker-specific naming
 * Variable names must be unique within each worker
 */
export interface Variable {
  id: string
  workerId: string
  name: string // Must be unique per worker
  type: VariableType
  value: any
  validationError?: string // Tracks format validation errors
}
