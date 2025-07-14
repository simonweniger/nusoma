'use client'

import { useMemo } from 'react'
import { Badge } from '@nusoma/design-system/components/ui/badge'
import { Button } from '@nusoma/design-system/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@nusoma/design-system/components/ui/tooltip'
import { cn } from '@nusoma/design-system/lib/utils'
import { BookOpen, Code, Info, Trash2 } from 'lucide-react'
import { getBlock } from '@/blocks'
import type { SubBlockConfig } from '@/blocks/types'
import { usePanelStore } from '@/stores/panel/store'
import { useWorkerRegistry } from '@/stores/workers/registry/store'
import { mergeSubblockState } from '@/stores/workers/utils'
import { useWorkerStore } from '@/stores/workers/worker/store'
import { SubBlock } from '../../../worker-block/components/sub-block/sub-block'

export function ConfigTab() {
  const { selectedBlockId } = usePanelStore()

  // Get block data from worker store
  const allBlocks = useWorkerStore((state) => state.blocks)
  const blockData = allBlocks[selectedBlockId || '']
  const isEnabled = blockData?.enabled ?? true
  const isWide = blockData?.isWide ?? false
  const blockAdvancedMode = blockData?.advancedMode ?? false

  // Get the block configuration dynamically using the block type
  const selectedBlockConfig = useMemo(() => {
    if (!blockData?.type) return null
    return getBlock(blockData.type)
  }, [blockData?.type])

  // Worker store actions
  const removeBlock = useWorkerStore((state) => state.removeBlock)
  const toggleBlockAdvancedMode = useWorkerStore((state) => state.toggleBlockAdvancedMode)

  // Get activeWorkerId using proper hook
  const activeWorkerId = useWorkerRegistry((state) => state.activeWorkerId)

  // Memoize the merged subblock values to prevent infinite loops
  const subBlockValues = useMemo(() => {
    if (!selectedBlockId || !activeWorkerId) return {}

    const mergedState = mergeSubblockState(allBlocks, activeWorkerId, selectedBlockId)[
      selectedBlockId
    ]
    return mergedState?.subBlocks || {}
  }, [allBlocks, activeWorkerId, selectedBlockId])

  // SubBlock layout management - moved before early return and memoized
  const groupSubBlocks = useMemo(() => {
    return (subBlocks: SubBlockConfig[], blockId: string) => {
      const rows: SubBlockConfig[][] = []
      let currentRow: SubBlockConfig[] = []
      let currentRowWidth = 0

      // Get the merged state for conditional evaluation
      const stateToUse = subBlockValues

      // Filter visible blocks and those that meet their conditions
      const visibleSubBlocks = subBlocks.filter((block) => {
        if (block.hidden) {
          return false
        }

        // Filter by mode if specified
        if (block.mode) {
          if (block.mode === 'basic' && blockAdvancedMode) {
            return false
          }
          if (block.mode === 'advanced' && !blockAdvancedMode) {
            return false
          }
        }

        // If there's no condition, the block should be shown
        if (!block.condition) {
          return true
        }

        // Get the values of the fields this block depends on from the appropriate state
        const fieldValue = stateToUse[block.condition.field]?.value
        const andFieldValue = block.condition.and
          ? stateToUse[block.condition.and.field]?.value
          : undefined

        // Check if the condition value is an array
        const isValueMatch = Array.isArray(block.condition.value)
          ? fieldValue != null &&
            (block.condition.not
              ? !block.condition.value.includes(fieldValue as string | number | boolean)
              : block.condition.value.includes(fieldValue as string | number | boolean))
          : block.condition.not
            ? fieldValue !== block.condition.value
            : fieldValue === block.condition.value

        // Check both conditions if 'and' is present
        const isAndValueMatch =
          !block.condition.and ||
          (Array.isArray(block.condition.and.value)
            ? andFieldValue != null &&
              (block.condition.and.not
                ? !block.condition.and.value.includes(andFieldValue as string | number | boolean)
                : block.condition.and.value.includes(andFieldValue as string | number | boolean))
            : block.condition.and.not
              ? andFieldValue !== block.condition.and.value
              : andFieldValue === block.condition.and.value)

        return isValueMatch && isAndValueMatch
      })

      visibleSubBlocks.forEach((block) => {
        const blockWidth = block.layout === 'half' ? 0.5 : 1
        if (currentRowWidth + blockWidth > 1) {
          if (currentRow.length > 0) {
            rows.push([...currentRow])
          }
          currentRow = [block]
          currentRowWidth = blockWidth
        } else {
          currentRow.push(block)
          currentRowWidth += blockWidth
        }
      })

      if (currentRow.length > 0) {
        rows.push(currentRow)
      }

      return rows
    }
  }, [subBlockValues, blockAdvancedMode])

  // Memoize the subblock rows to prevent unnecessary recalculations
  const subBlockRows = useMemo(() => {
    if (!selectedBlockConfig?.subBlocks || !selectedBlockId) return []
    return groupSubBlocks(selectedBlockConfig.subBlocks, selectedBlockId)
  }, [selectedBlockConfig?.subBlocks, selectedBlockId, groupSubBlocks])

  if (!selectedBlockId || !selectedBlockConfig || !blockData) {
    return (
      <div className='flex h-full items-center justify-center'>
        <p className='text-muted-foreground text-sm'>No block selected</p>
      </div>
    )
  }

  const isStarterBlock = blockData.type === 'starter'

  return (
    <div className='h-full overflow-y-auto'>
      {/* Block Header - matching WorkerBlock structure */}
      <div className='flex cursor-default items-center justify-between rounded-t-lg border-border/80 border-b bg-gradient-to-t from-muted/70 to-background px-4 py-3 dark:from-muted/30 dark:to-background'>
        <div className='flex min-w-0 flex-1 items-center gap-3'>
          <div
            className='flex h-7 w-7 flex-shrink-0 items-center justify-center rounded'
            style={{ backgroundColor: isEnabled ? selectedBlockConfig.bgColor : 'gray' }}
          >
            {selectedBlockConfig.icon && (
              <selectedBlockConfig.icon className='h-5 w-5 text-white' />
            )}
          </div>
          <div className='min-w-0'>
            <span
              className={cn(
                'inline-block font-medium text-md',
                !isEnabled && 'text-muted-foreground'
              )}
              title={blockData.name}
              style={{
                maxWidth: isEnabled ? '180px' : isWide ? '200px' : '140px',
              }}
            >
              {blockData.name}
            </span>
          </div>
        </div>
        <div className='flex flex-shrink-0 items-center gap-2'>
          {!isEnabled && (
            <Badge variant='secondary' className='bg-gray-100 text-gray-500 hover:bg-gray-100'>
              Disabled
            </Badge>
          )}
          {selectedBlockConfig.subBlocks.some((block) => block.mode) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => toggleBlockAdvancedMode(selectedBlockId)}
                  className={cn('h-7 p-1 text-gray-500', blockAdvancedMode && 'text-primary')}
                >
                  <Code className='h-5 w-5' />
                </Button>
              </TooltipTrigger>
              <TooltipContent side='top'>
                {blockAdvancedMode ? 'Switch to Basic Mode' : 'Switch to Advanced Mode'}
              </TooltipContent>
            </Tooltip>
          )}
          {!isStarterBlock && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => removeBlock(selectedBlockId)}
                  className='h-7 p-1 text-gray-500 hover:text-red-600'
                >
                  <Trash2 className='h-5 w-5' />
                </Button>
              </TooltipTrigger>
              <TooltipContent side='top'>Delete Block</TooltipContent>
            </Tooltip>
          )}
          {selectedBlockConfig.docsLink ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-7 p-1 text-gray-500'
                  onClick={(e) => {
                    e.stopPropagation()
                    window.open(selectedBlockConfig.docsLink, '_target', 'noopener,noreferrer')
                  }}
                >
                  <BookOpen className='h-5 w-5' />
                </Button>
              </TooltipTrigger>
              <TooltipContent side='top'>See Docs</TooltipContent>
            </Tooltip>
          ) : (
            selectedBlockConfig.longDescription && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant='ghost' size='sm' className='h-7 p-1 text-gray-500'>
                    <Info className='h-5 w-5' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side='top' className='max-w-[300px] p-4'>
                  <div className='space-y-3'>
                    <div>
                      <p className='mb-1 font-medium text-sm'>Description</p>
                      <p className='text-muted-foreground text-sm'>
                        {selectedBlockConfig.longDescription}
                      </p>
                    </div>
                    {selectedBlockConfig.outputs && (
                      <div>
                        <p className='mb-1 font-medium text-sm'>Output</p>
                        <div className='text-sm'>
                          {Object.entries(selectedBlockConfig.outputs).map(([key, value]) => (
                            <div key={key} className='mb-1'>
                              <span className='text-muted-foreground'>{key}</span>{' '}
                              {typeof value.type === 'object' ? (
                                <div className='mt-1 pl-3'>
                                  {Object.entries(value.type).map(([typeKey, typeValue]) => (
                                    <div key={typeKey} className='flex items-start'>
                                      <span className='font-medium text-blue-500'>{typeKey}:</span>
                                      <span className='ml-1 text-green-500'>
                                        {typeValue as string}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className='text-green-500'>{value.type as string}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            )
          )}
        </div>
      </div>

      {/* Block Content - matching WorkerBlock structure */}
      <div className='space-y-4 px-4 pt-3 pb-4'>
        {subBlockRows.length > 0 ? (
          subBlockRows.map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} className='flex gap-4'>
              {row.map((subBlock, blockIndex) => (
                <div
                  key={`${selectedBlockId}-${rowIndex}-${blockIndex}`}
                  className={cn('space-y-1', subBlock.layout === 'half' ? 'flex-1' : 'w-full')}
                >
                  <SubBlock
                    blockId={selectedBlockId}
                    config={subBlock}
                    isConnecting={false}
                    isPreview={false}
                    subBlockValues={subBlockValues}
                  />
                </div>
              ))}
            </div>
          ))
        ) : (
          <div className='flex h-20 items-center justify-center'>
            <p className='text-muted-foreground text-sm'>No configuration fields</p>
          </div>
        )}
      </div>
    </div>
  )
}
