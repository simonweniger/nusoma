export interface ChatMessage {
  id: string
  content: string | any
  workerId: string
  type: 'user' | 'worker'
  timestamp: string
  blockId?: string
  isStreaming?: boolean
}

export interface OutputConfig {
  blockId: string
  path: string
}

export interface ChatStore {
  messages: ChatMessage[]
  selectedWorkerOutputs: Record<string, string[]>
  conversationIds: Record<string, string>
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'> & { id?: string }) => void
  clearChat: (workerId: string | null) => void
  getWorkerMessages: (workerId: string) => ChatMessage[]
  setSelectedWorkerOutput: (workerId: string, outputIds: string[]) => void
  getSelectedWorkerOutput: (workerId: string) => string[]
  appendMessageContent: (messageId: string, content: string) => void
  finalizeMessageStream: (messageId: string) => void
  getConversationId: (workerId: string) => string
  generateNewConversationId: (workerId: string) => string
}
