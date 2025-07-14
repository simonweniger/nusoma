'use client'

import { type KeyboardEvent, useEffect, useMemo, useRef } from 'react'
import { Button } from '@nusoma/design-system/components/ui/button'
import { Input } from '@nusoma/design-system/components/ui/input'
import { ScrollArea } from '@nusoma/design-system/components/ui/scroll-area'
import { SendIcon } from 'lucide-react'
import type { BlockLog, ExecutionResult } from '@/executor/types'
import { useExecutionStore } from '@/stores/execution/store'
import { useChatStore } from '@/stores/panel/chat/store'
import { useConsoleStore } from '@/stores/panel/console/store'
import { useWorkerRegistry } from '@/stores/workers/registry/store'
import { useWorkerExecution } from '../../../../hooks/use-worker-execution'
import { ChatMessage } from './components/chat-message/chat-message'
import { OutputSelect } from './components/output-select/output-select'

interface ChatProps {
  panelWidth: number
  chatMessage: string
  setChatMessage: (message: string) => void
}

export function Chat({ panelWidth, chatMessage, setChatMessage }: ChatProps) {
  const { activeWorkerId } = useWorkerRegistry()
  const {
    messages,
    addMessage,
    selectedWorkerOutputs,
    setSelectedWorkerOutput,
    appendMessageContent,
    finalizeMessageStream,
    getConversationId,
  } = useChatStore()
  const { entries } = useConsoleStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Use the execution store state to track if a worker is executing
  const { isExecuting } = useExecutionStore()

  // Get worker execution functionality
  const { handleRunWorker } = useWorkerExecution()

  // Get output entries from console for the dropdown
  const outputEntries = useMemo(() => {
    if (!activeWorkerId) return []
    return entries.filter((entry) => entry.workerId === activeWorkerId && entry.output)
  }, [entries, activeWorkerId])

  // Get filtered messages for current worker
  const workerMessages = useMemo(() => {
    if (!activeWorkerId) return []
    return messages
      .filter((msg) => msg.workerId === activeWorkerId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }, [messages, activeWorkerId])

  // Get selected worker outputs
  const selectedOutputs = useMemo(() => {
    if (!activeWorkerId) return []
    const selected = selectedWorkerOutputs[activeWorkerId]

    if (!selected || selected.length === 0) {
      const defaultSelection = outputEntries.map((entry) => entry.id)
      return defaultSelection
    }

    // Ensure we have no duplicates in the selection
    const dedupedSelection = [...new Set(selected)]

    // If deduplication removed items, update the store
    if (dedupedSelection.length !== selected.length) {
      setSelectedWorkerOutput(activeWorkerId, dedupedSelection)
      return dedupedSelection
    }

    return selected
  }, [selectedWorkerOutputs, activeWorkerId, outputEntries, setSelectedWorkerOutput])

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [workerMessages])

  // Handle send message
  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !activeWorkerId || isExecuting) return

    // Store the message being sent for reference
    const sentMessage = chatMessage.trim()

    // Get the conversationId for this worker before adding the message
    const conversationId = getConversationId(activeWorkerId)

    // Add user message
    addMessage({
      content: sentMessage,
      workerId: activeWorkerId,
      type: 'user',
    })

    // Clear input
    setChatMessage('')

    // Execute the worker to generate a response, passing the chat message and conversationId as input
    const result = await handleRunWorker({
      input: sentMessage,
      conversationId: conversationId,
    })

    // Check if we got a streaming response
    if (result && 'stream' in result && result.stream instanceof ReadableStream) {
      const messageIdMap = new Map<string, string>()

      const reader = result.stream.getReader()
      const decoder = new TextDecoder()

      const processStream = async () => {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            // Finalize all streaming messages
            messageIdMap.forEach((id) => finalizeMessageStream(id))
            break
          }

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const json = JSON.parse(line.substring(6))
                const { blockId, chunk: contentChunk, event, data } = json

                if (event === 'final' && data) {
                  const result = data as ExecutionResult
                  const nonStreamingLogs =
                    result.logs?.filter((log) => !messageIdMap.has(log.blockId)) || []

                  if (nonStreamingLogs.length > 0) {
                    const outputsToRender = selectedOutputs.filter((outputId) =>
                      nonStreamingLogs.some((log) => log.blockId === outputId.split('.')[0])
                    )

                    for (const outputId of outputsToRender) {
                      const blockIdForOutput = outputId.split('.')[0]
                      const path = outputId.substring(blockIdForOutput.length + 1)
                      const log = nonStreamingLogs.find((l) => l.blockId === blockIdForOutput)

                      if (log) {
                        let outputValue: any = log.output
                        if (path) {
                          const pathParts = path.split('.')
                          for (const part of pathParts) {
                            if (
                              outputValue &&
                              typeof outputValue === 'object' &&
                              part in outputValue
                            ) {
                              outputValue = outputValue[part]
                            } else {
                              outputValue = undefined
                              break
                            }
                          }
                        }
                        if (outputValue !== undefined) {
                          addMessage({
                            content:
                              typeof outputValue === 'string'
                                ? outputValue
                                : `\`\`\`json\n${JSON.stringify(outputValue, null, 2)}\n\`\`\``,
                            workerId: activeWorkerId,
                            type: 'worker',
                          })
                        }
                      }
                    }
                  }
                } else if (blockId && contentChunk) {
                  if (!messageIdMap.has(blockId)) {
                    const newMessageId = crypto.randomUUID()
                    messageIdMap.set(blockId, newMessageId)
                    addMessage({
                      id: newMessageId,
                      content: contentChunk,
                      workerId: activeWorkerId,
                      type: 'worker',
                      isStreaming: true,
                    })
                  } else {
                    const existingMessageId = messageIdMap.get(blockId)
                    if (existingMessageId) {
                      appendMessageContent(existingMessageId, contentChunk)
                    }
                  }
                } else if (blockId && event === 'end') {
                  const existingMessageId = messageIdMap.get(blockId)
                  if (existingMessageId) {
                    finalizeMessageStream(existingMessageId)
                  }
                }
              } catch (e) {
                console.error('Error parsing stream data:', e)
              }
            }
          }
        }
      }

      processStream().catch((e) => console.error('Error processing stream:', e))
    } else if (result && 'success' in result && result.success && 'logs' in result) {
      const finalOutputs: any[] = []

      if (selectedOutputs && selectedOutputs.length > 0) {
        for (const outputId of selectedOutputs) {
          // Find the log that corresponds to the start of the outputId
          const log = result.logs?.find(
            (l: BlockLog) => l.blockId === outputId || outputId.startsWith(`${l.blockId}_`)
          )

          if (log) {
            let output = log.output
            // Check if there is a path to traverse
            if (outputId.length > log.blockId.length) {
              const path = outputId.substring(log.blockId.length + 1)
              if (path) {
                const pathParts = path.split('.')
                let current = output
                for (const part of pathParts) {
                  if (current && typeof current === 'object' && part in current) {
                    current = current[part]
                  } else {
                    current = undefined
                    break
                  }
                }
                output = current
              }
            }
            if (output !== undefined) {
              finalOutputs.push(output)
            }
          }
        }
      }

      // If no specific outputs could be resolved, fall back to the final worker output
      if (finalOutputs.length === 0 && result.output) {
        finalOutputs.push(result.output)
      }

      // Add a new message for each resolved output
      finalOutputs.forEach((output) => {
        let content = ''
        if (typeof output === 'string') {
          content = output
        } else if (output && typeof output === 'object') {
          // Handle cases where output is { response: ... }
          const outputObj = output as Record<string, any>
          const response = outputObj.response
          if (response) {
            if (typeof response.content === 'string') {
              content = response.content
            } else {
              // Pretty print for better readability
              content = `\`\`\`json\n${JSON.stringify(response, null, 2)}\n\`\`\``
            }
          } else {
            content = `\`\`\`json\n${JSON.stringify(output, null, 2)}\n\`\`\``
          }
        }

        if (content) {
          addMessage({
            content,
            workerId: activeWorkerId,
            type: 'worker',
          })
        }
      })
    } else if (result && 'success' in result && !result.success) {
      addMessage({
        content: `Error: ${'error' in result ? result.error : 'Worker execution failed.'}`,
        workerId: activeWorkerId,
        type: 'worker',
      })
    }
  }

  // Handle key press
  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Handle output selection
  const handleOutputSelection = (values: string[]) => {
    // Ensure no duplicates in selection
    const dedupedValues = [...new Set(values)]

    if (activeWorkerId) {
      // If array is empty, explicitly set to empty array to ensure complete reset
      if (dedupedValues.length === 0) {
        setSelectedWorkerOutput(activeWorkerId, [])
      } else {
        setSelectedWorkerOutput(activeWorkerId, dedupedValues)
      }
    }
  }

  return (
    <div className='flex h-full flex-col'>
      {/* Output Source Dropdown */}
      <div className='flex-none border-b px-4 py-2'>
        <OutputSelect
          workerId={activeWorkerId}
          selectedOutputs={selectedOutputs}
          onOutputSelect={handleOutputSelection}
          disabled={!activeWorkerId}
          placeholder='Select output sources'
        />
      </div>

      {/* Main layout with fixed heights to ensure input stays visible */}
      <div className='flex flex-1 flex-col overflow-hidden'>
        {/* Chat messages section - Scrollable area */}
        <div className='flex-1 overflow-hidden'>
          <ScrollArea className='h-full'>
            <div>
              {workerMessages.length === 0 ? (
                <div className='flex h-32 items-center justify-center text-muted-foreground text-sm'>
                  No messages yet
                </div>
              ) : (
                workerMessages.map((message) => (
                  <ChatMessage key={message.id} message={message} containerWidth={panelWidth} />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Input section - Fixed height */}
        <div className='-mt-[1px] relative flex-none border-t bg-background px-4 pt-4 pb-4'>
          <div className='flex gap-2'>
            <Input
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder='Type a message...'
              className='h-10 flex-1 focus-visible:ring-0 focus-visible:ring-offset-0'
              disabled={!activeWorkerId || isExecuting}
            />
            <Button
              onClick={handleSendMessage}
              size='icon'
              disabled={!chatMessage.trim() || !activeWorkerId || isExecuting}
            >
              <SendIcon fill={chatMessage.trim() ? 'currentColor' : 'none'} className='h-4 w-4' />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
