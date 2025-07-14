export interface SubBlockState {
  workerValues: Record<string, Record<string, Record<string, any>>> // Store values per worker ID
  toolParams: Record<string, Record<string, string>>
  clearedParams: Record<string, Record<string, boolean>>
}

export interface SubBlockStore extends SubBlockState {
  setValue: (blockId: string, subBlockId: string, value: any) => void
  getValue: (blockId: string, subBlockId: string) => any
  clear: () => void
  initializeFromWorker: (workerId: string, blocks: Record<string, any>) => void

  // Tool params related functions
  setToolParam: (toolId: string, paramId: string, value: string) => void
  markParamAsCleared: (instanceId: string, paramId: string) => void
  unmarkParamAsCleared: (instanceId: string, paramId: string) => void
  isParamCleared: (instanceId: string, paramId: string) => boolean
  getToolParam: (toolId: string, paramId: string) => string | undefined
  getToolParams: (toolId: string) => Record<string, string>
  isEnvVarReference: (value: string) => boolean
  resolveToolParamValue: (
    toolId: string,
    paramId: string,
    instanceId?: string
  ) => string | undefined
  clearToolParams: () => void
}
