'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@nusoma/design-system/components/ui/tooltip'
import { Box } from 'lucide-react'
import type { BlockConfig } from '@/blocks'

interface BlocksCountTooltipProps {
  blocks: BlockConfig[]
}

export function BlocksCountTooltip({ blocks }: BlocksCountTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className='flex cursor-pointer items-center gap-2'>
            <Box className='size-4' />
            <span>{blocks.length}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent className='p-2'>
          <div className='flex flex-col gap-1'>
            {blocks.map((block, index) => (
              <div key={index} className='flex items-center gap-2'>
                <block.icon className='size-3 shrink-0' />
                <span className='w-full text-left text-sm'>{block.name}</span>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
