import { v4 as uuidv4 } from 'uuid'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { ChatMessage, ChatStore } from './types'

// MAX across all workers
const MAX_MESSAGES = 50

export const useChatStore = create<ChatStore>()(
  devtools(
    persist(
      (set, get) => ({
        messages: [],
        selectedWorkerOutputs: {},
        conversationIds: {},

        addMessage: (message) => {
          set((state) => {
            const newMessage: ChatMessage = {
              ...message,
              // Preserve provided id and timestamp if they exist; otherwise generate new ones
              id: (message as any).id ?? crypto.randomUUID(),
              timestamp: (message as any).timestamp ?? new Date().toISOString(),
            }

            // Keep only the last MAX_MESSAGES
            const newMessages = [newMessage, ...state.messages].slice(0, MAX_MESSAGES)

            return { messages: newMessages }
          })
        },

        clearChat: (workerId: string | null) => {
          set((state) => {
            const newState = {
              messages: state.messages.filter(
                (message) => !workerId || message.workerId !== workerId
              ),
            }

            // Generate a new conversationId when clearing chat for a specific worker
            if (workerId) {
              const newConversationIds = { ...state.conversationIds }
              newConversationIds[workerId] = uuidv4()
              return {
                ...newState,
                conversationIds: newConversationIds,
              }
            }
            // When clearing all chats (workerId is null), also clear all conversationIds
            return {
              ...newState,
              conversationIds: {},
            }
          })
        },

        getWorkerMessages: (workerId) => {
          return get().messages.filter((message) => message.workerId === workerId)
        },

        setSelectedWorkerOutput: (workerId, outputIds) => {
          set((state) => {
            // Create a new copy of the selections state
            const newSelections = { ...state.selectedWorkerOutputs }

            // If empty array, explicitly remove the key to prevent empty arrays from persisting
            if (outputIds.length === 0) {
              // Delete the key entirely instead of setting to empty array
              delete newSelections[workerId]
            } else {
              // Ensure no duplicates in the selection by using Set
              newSelections[workerId] = [...new Set(outputIds)]
            }

            return { selectedWorkerOutputs: newSelections }
          })
        },

        getSelectedWorkerOutput: (workerId) => {
          return get().selectedWorkerOutputs[workerId] || []
        },

        getConversationId: (workerId) => {
          const state = get()
          if (!state.conversationIds[workerId]) {
            // Generate a new conversation ID if one doesn't exist
            return get().generateNewConversationId(workerId)
          }
          return state.conversationIds[workerId]
        },

        generateNewConversationId: (workerId) => {
          const newId = uuidv4()
          set((state) => {
            const newConversationIds = { ...state.conversationIds }
            newConversationIds[workerId] = newId
            return { conversationIds: newConversationIds }
          })
          return newId
        },

        appendMessageContent: (messageId, content) => {
          set((state) => {
            const newMessages = state.messages.map((message) => {
              if (message.id === messageId) {
                return {
                  ...message,
                  content:
                    typeof message.content === 'string'
                      ? message.content + content
                      : message.content
                        ? String(message.content) + content
                        : content,
                }
              }
              return message
            })

            return { messages: newMessages }
          })
        },

        finalizeMessageStream: (messageId) => {
          set((state) => {
            const newMessages = state.messages.map((message) => {
              if (message.id === messageId) {
                const { isStreaming, ...rest } = message
                return rest
              }
              return message
            })

            return { messages: newMessages }
          })
        },
      }),
      {
        name: 'chat-store',
      }
    )
  )
)
