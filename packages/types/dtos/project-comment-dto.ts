export type ProjectCommentDto = {
  id: string
  text: string
  edited: boolean
  createdAt: Date
  sender: {
    name: string
    image?: string
  }
}
