export type WorkerNoteDto = {
  id: string
  workerId: string
  text?: string
  edited: boolean
  createdAt: Date
  updatedAt: Date
  sender: {
    id: string
    name: string
    image?: string
  }
}
