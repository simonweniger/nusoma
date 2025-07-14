'use client'

import { useMemo } from 'react'
import { Button } from '@nusoma/design-system/components/ui/button'
import { ScrollArea } from '@nusoma/design-system/components/ui/scroll-area'
import { ArrowLeft } from 'lucide-react'
import { getBlock } from '@/blocks'
import { usePanelStore } from '@/stores/panel/store'
import { useSubBlockStore } from '@/stores/workers/subblock/store'
import { useWorkerStore } from '@/stores/workers/worker/store'
import { SubBlock } from '../../../worker-block/components/sub-block/sub-block'

export function Toolbar() {
  // Get selected block info from panel store
  const { selectedBlockId, setSelectedBlockId } = usePanelStore()

  // Get block data from worker store
  const allBlocks = useWorkerStore((state) => state.blocks)
  const blockData = allBlocks[selectedBlockId || '']

  // Get the block configuration dynamically using the block type
  const selectedBlockConfig = useMemo(() => {
    if (!blockData?.type) return null
    return getBlock(blockData.type)
  }, [blockData?.type])

  // Get block values from worker store
  const { workerValues } = useSubBlockStore()

  // If a block is selected, show its configuration
  if (selectedBlockId && selectedBlockConfig) {
    return (
      <div className='flex h-full flex-col'>
        {/* Header with back button */}
        <div className='flex items-center gap-3 px-4 pt-4 pb-1'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setSelectedBlockId(null)}
            className='h-8 w-8 p-0'
          >
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div className='flex items-center gap-2'>
            <div
              className='flex h-6 w-6 items-center justify-center rounded'
              style={{ backgroundColor: selectedBlockConfig.bgColor }}
            >
              {selectedBlockConfig.icon && (
                <selectedBlockConfig.icon className='h-3 w-3 text-white' />
              )}
            </div>
            <span className='font-medium text-sm'>{selectedBlockConfig.name}</span>
          </div>
        </div>

        {/* Block configuration form */}
        <ScrollArea className='flex-1'>
          <div className='space-y-4 px-4 pb-8'>
            {selectedBlockConfig.subBlocks?.map((subBlockConfig, index) => (
              <SubBlock
                key={`${selectedBlockId}-${subBlockConfig.id}-${index}`}
                blockId={selectedBlockId}
                config={subBlockConfig}
                isConnecting={false}
                subBlockValues={workerValues}
              />
            ))}
            {(!selectedBlockConfig.subBlocks || selectedBlockConfig.subBlocks.length === 0) && (
              <div className='py-8 text-center text-muted-foreground text-sm'>
                This block has no configuration options.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    )
  }

  // If no block is selected, show a message
  return (
    <div className='flex h-full flex-col items-center justify-center p-8'>
      <div className='text-center'>
        <div className='mb-4 text-lg text-muted-foreground'>No Block Selected</div>
        <p className='text-muted-foreground text-sm'>
          Click on a worker block to configure its settings and inputs.
        </p>
      </div>
    </div>
  )
}
