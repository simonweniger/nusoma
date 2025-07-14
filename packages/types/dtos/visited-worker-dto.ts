import type { WorkerRecord } from '@workspace/database/schema'

export type VisitedWorkerDto = {
  id: string
  name: string
  image?: string
  record: WorkerRecord
  pageVisits: number
}
