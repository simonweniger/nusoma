'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardTitle } from '@nusoma/design-system/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@nusoma/design-system/components/ui/dialog'
import { Input } from '@nusoma/design-system/components/ui/input'
import { Plus, Search, Wrench } from 'lucide-react'
import { getAllBlocks, getBlocksByCategory } from '@/blocks'
import type { BlockConfig } from '@/blocks/types'

interface BlockSelectionPanelProps {
  isOpen: boolean
  onClose: () => void
  onBlockSelect: (blockType: string) => void
  position: { x: number; y: number }
  terminalNodeId?: string
  isEdgeInsertion?: boolean
  isEdgeSplit?: boolean
}

export function BlockSelectionPanel({
  isOpen,
  onClose,
  onBlockSelect,
  position,
  terminalNodeId,
  isEdgeInsertion = false,
  isEdgeSplit = false,
}: BlockSelectionPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [isToolsModalOpen, setIsToolsModalOpen] = useState(false)
  const [toolSearchQuery, setToolSearchQuery] = useState('')

  // Get available blocks
  const allBlocks = getAllBlocks()
  const toolBlocks = getBlocksByCategory('tools')

  // Create sections for different block types
  const coreBlocks = allBlocks.filter((block) =>
    ['agent', 'knowledge', 'condition', 'loop', 'parallel', 'worker', 'memory', 'router'].includes(
      block.type
    )
  )

  // Filter tool blocks to exclude internal ones and those we don't want to show
  const availableToolBlocks = toolBlocks.filter(
    (block) => !block.type.startsWith('_') && !block.hideFromToolbar && block.type !== 'starter'
  )

  // Filter tools based on search query
  const filteredToolBlocks = availableToolBlocks.filter(
    (block) =>
      !toolSearchQuery.trim() ||
      block.name.toLowerCase().includes(toolSearchQuery.toLowerCase()) ||
      block.description.toLowerCase().includes(toolSearchQuery.toLowerCase())
  )

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Close panel on escape key
  useEffect(() => {
    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (isToolsModalOpen) {
          setIsToolsModalOpen(false)
        } else {
          onClose()
        }
      }
    }

    if (isOpen || isToolsModalOpen) {
      document.addEventListener('keydown', handleEscapeKey)
      return () => document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [isOpen, isToolsModalOpen, onClose])

  if (!isOpen) return null

  const handleBlockClick = (blockType: string) => {
    // Dispatch event with terminalNodeId or edge insertion flag
    const event = new CustomEvent('add-block-from-toolbar', {
      detail: {
        type: blockType,
        terminalNodeId: isEdgeInsertion ? undefined : terminalNodeId,
        insertBetweenEdge: isEdgeInsertion,
        isEdgeSplit,
      },
    })
    window.dispatchEvent(event)
    onClose()
  }

  const handleToolSelect = (blockType: string) => {
    // Dispatch event with terminalNodeId or edge insertion flag
    const event = new CustomEvent('add-block-from-toolbar', {
      detail: {
        type: blockType,
        terminalNodeId: isEdgeInsertion ? undefined : terminalNodeId,
        insertBetweenEdge: isEdgeInsertion,
        isEdgeSplit,
      },
    })
    window.dispatchEvent(event)
    setIsToolsModalOpen(false)
    onClose()
  }

  const handlePerformActionClick = () => {
    setIsToolsModalOpen(true)
  }

  return (
    <>
      <div
        ref={panelRef}
        className='relative z-50 rounded-xl border border-border/30 bg-muted p-1'
        style={{ pointerEvents: 'auto' }}
      >
        <div className='flex items-start p-3'>
          <CardTitle className='text-center font-medium text-sm'>Select next step</CardTitle>
        </div>
        <Card
          className='w-[400px]'
          onClick={(e) => {
            e.stopPropagation()
          }}
          style={{ pointerEvents: 'auto' }}
        >
          <CardContent className='w-full p-0' style={{ pointerEvents: 'auto' }}>
            {coreBlocks.map((block, index) => (
              <div
                key={block.type}
                role='button'
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  handleBlockClick(block.type)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleBlockClick(block.type)
                  }
                }}
                className={`group flex w-full cursor-pointer items-center justify-between p-3 transition-colors hover:bg-muted ${
                  index === 0 ? 'rounded-t-lg' : ''
                } ${
                  index === coreBlocks.length - 1 && availableToolBlocks.length === 0
                    ? 'rounded-b-lg'
                    : ''
                }`}
                style={{ pointerEvents: 'auto' }}
              >
                <div className='pointer-events-none flex items-center gap-3'>
                  <div
                    className='pointer-events-none flex h-6 w-6 items-center justify-center rounded'
                    style={{ backgroundColor: block.bgColor }}
                  >
                    <block.icon className='pointer-events-none h-3 w-3' />
                  </div>
                  <span className='pointer-events-none font-medium'>
                    {getBlockDisplayName(block)}
                  </span>
                </div>
                <Plus className='pointer-events-none h-3 w-3 text-muted-foreground transition-colors group-hover:text-primary' />
              </div>
            ))}

            {/* Perform Action Item */}
            {availableToolBlocks.length > 0 && (
              <div
                role='button'
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  handlePerformActionClick()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handlePerformActionClick()
                  }
                }}
                className='group flex w-full cursor-pointer items-center justify-between rounded-b-lg p-3 transition-colors hover:bg-muted'
                style={{ pointerEvents: 'auto' }}
              >
                <div className='pointer-events-none flex items-center gap-3'>
                  <div className='pointer-events-none flex h-6 w-6 items-center justify-center rounded bg-orange-500'>
                    <Wrench className='pointer-events-none h-3 w-3 text-white' />
                  </div>
                  <span className='pointer-events-none font-medium'>Perform action</span>
                </div>
                <Plus className='pointer-events-none h-3 w-3 text-muted-foreground transition-colors group-hover:text-primary' />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Dialog open={isToolsModalOpen} onOpenChange={setIsToolsModalOpen}>
        <DialogContent
          className='flex max-h-[80vh] max-w-2xl flex-col overflow-hidden'
          style={{ pointerEvents: 'auto' }}
        >
          <DialogHeader>
            <DialogTitle>Select an action</DialogTitle>
          </DialogHeader>

          {/* Search Input */}
          <div className='relative mb-4'>
            <Search className='-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground' />
            <Input
              placeholder='Search actions...'
              value={toolSearchQuery}
              onChange={(e) => setToolSearchQuery(e.target.value)}
              className='pl-10'
              style={{ pointerEvents: 'auto' }}
            />
          </div>

          {/* Tools Grid */}
          <div className='flex-1 overflow-y-auto' style={{ pointerEvents: 'auto' }}>
            <div className='grid grid-cols-2 gap-2'>
              {filteredToolBlocks.map((block) => (
                <div
                  key={block.type}
                  role='button'
                  tabIndex={0}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleToolSelect(block.type)
                  }}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleToolSelect(block.type)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleToolSelect(block.type)
                    }
                  }}
                  className='group flex cursor-pointer items-center gap-3 rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted'
                  style={{ pointerEvents: 'auto' }}
                >
                  <div
                    className='pointer-events-none flex h-8 w-8 items-center justify-center rounded'
                    style={{ backgroundColor: block.bgColor }}
                  >
                    <block.icon className='pointer-events-none h-4 w-4 text-white' />
                  </div>
                  <div className='pointer-events-none min-w-0 flex-1'>
                    <span className='pointer-events-none block truncate font-medium text-sm'>
                      {block.name}
                    </span>
                    <span className='pointer-events-none block truncate text-muted-foreground text-xs'>
                      {block.description}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {filteredToolBlocks.length === 0 && toolSearchQuery && (
              <div className='py-8 text-center text-muted-foreground'>
                No actions found matching "{toolSearchQuery}"
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Helper function to get display names for blocks
function getBlockDisplayName(block: BlockConfig): string {
  const displayNames: Record<string, string> = {
    agent: 'Enter AI agent',
    knowledge: 'Search knowledge base',
    condition: 'Condition',
    loop: 'Enter loop',
    parallel: 'Enter parallel',
    worker: 'Call another worker',
    memory: 'Access memory',
    router: 'Enter router',
  }

  // For tool blocks, use their actual names
  return displayNames[block.type] || block.name
}
