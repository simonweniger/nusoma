import { Button } from '@nusoma/design-system/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@nusoma/design-system/components/ui/tooltip'
import { cn } from '@nusoma/design-system/lib/utils'
import { Circle, CircleOff, Copy, Trash2 } from 'lucide-react'
import { useWorkerStore } from '@/stores/workers/worker/store'

interface ActionBarProps {
  blockId: string
  blockType: string
  disabled: boolean
}

export function ActionBar({ blockId, blockType, disabled }: ActionBarProps) {
  const toggleBlockEnabled = useWorkerStore((state) => state.toggleBlockEnabled)
  //const toggleBlockHandles = useWorkerStore((state) => state.toggleBlockHandles)
  const removeBlock = useWorkerStore((state) => state.removeBlock)
  //const toggleShowConnectionBlocks = useWorkerStore((state) => state.toggleShowConnectionBlocks)
  const duplicateBlock = useWorkerStore((state) => state.duplicateBlock)
  const isEnabled = useWorkerStore((state) => state.blocks[blockId]?.enabled ?? true)
  //const horizontalHandles = useWorkerStore(
  //  (state) => state.blocks[blockId]?.horizontalHandles ?? false
  //)

  const isStarterBlock = blockType === 'starter'

  return (
    <div
      className={cn(
        'group flex flex-row items-center rounded-b-xl border bg-muted p-2 pt-0 pb-0 transition-all duration-300 ease-in-out hover:pt-6 hover:pb-2'
      )}
    >
      <div className='flex w-full flex-row items-center justify-end gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100'>
        {' '}
        {!isStarterBlock && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => toggleBlockEnabled(blockId)}
                className='text-gray-500'
              >
                {isEnabled ? <Circle className='h-4 w-4' /> : <CircleOff className='h-4 w-4' />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side='right'>
              {isEnabled ? 'Disable Block' : 'Enable Block'}
            </TooltipContent>
          </Tooltip>
        )}
        {!isStarterBlock && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='sm'
                disabled={disabled}
                onClick={() => duplicateBlock(blockId)}
                className='text-gray-500'
              >
                <Copy className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent side='right'>Duplicate Block</TooltipContent>
          </Tooltip>
        )}
        {/* <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => toggleBlockHandles(blockId)}
            className='text-gray-500'
          >
            {horizontalHandles ? (
              <ArrowLeftRight className='h-4 w-4' />
            ) : (
              <ArrowUpDown className='h-4 w-4' />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side='right'>
          {horizontalHandles ? 'Vertical Ports' : 'Horizontal Ports'}
        </TooltipContent>
      </Tooltip> */}
        {/* 
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => toggleShowConnectionBlocks(blockId)}
            className='text-gray-500'
          >
            <Plug className='h-4 w-4' />
          </Button>
        </TooltipTrigger>
        <TooltipContent side='right'>Toggle Connections</TooltipContent>
      </Tooltip> */}
        {!isStarterBlock && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='sm'
                disabled={disabled}
                onClick={() => removeBlock(blockId)}
                className='h-7 p-1 text-gray-500 hover:bg-red-500/10 hover:text-red-600'
              >
                <Trash2 className='h-5 w-5' />
              </Button>
            </TooltipTrigger>
            <TooltipContent side='top'>Delete Block</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}
