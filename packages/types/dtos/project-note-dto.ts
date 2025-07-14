export type ProjectNoteDto = {
  id: string
  projectId: string
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
