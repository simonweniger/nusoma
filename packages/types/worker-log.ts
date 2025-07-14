export interface WorkerLogEntry {
  id: string
  workerId: string
  executionId: string | null
  level: string
  message: string
  duration: string | null
  trigger: string | null
  createdAt: Date
  metadata: any
}
