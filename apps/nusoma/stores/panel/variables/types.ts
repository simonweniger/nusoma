import type { Variable } from '@nusoma/types/variables'

export interface VariablesStore {
  variables: Record<string, Variable>
  isLoading: boolean
  error: string | null
  isEditing: string | null

  /**
   * Adds a new variable with automatic name uniqueness validation
   * If a variable with the same name exists, it will be suffixed with a number
   */
  addVariable: (variable: Omit<Variable, 'id'>) => string

  /**
   * Updates a variable, ensuring name remains unique within the worker
   * If an updated name conflicts with existing ones, a numbered suffix is added
   */
  updateVariable: (id: string, update: Partial<Omit<Variable, 'id' | 'workerId'>>) => void

  deleteVariable: (id: string) => void

  /**
   * Duplicates a variable with a "(copy)" suffix, ensuring name uniqueness
   */
  duplicateVariable: (id: string) => string

  loadVariables: (workerId: string) => Promise<void>
  saveVariables: (workerId: string) => Promise<void>

  /**
   * Returns all variables for a specific worker
   */
  getVariablesByWorkerId: (workerId: string) => Variable[]

  /**
   * Resets tracking of loaded workers
   */
  resetLoaded: () => void
}
