'use client'

import { Avatar, AvatarFallback } from '@nusoma/design-system/components/ui/avatar'
import { AvatarGroup, AvatarGroupTooltip } from '@nusoma/design-system/components/ui/avatar-group'
import type { BlockConfig } from '@/blocks'

interface BlocksTooltipProps {
  blocks: BlockConfig[]
}

export function BlocksTooltip({ blocks }: BlocksTooltipProps) {
  // Get the blocks to display (up to 3)
  const displayedBlocks = blocks.slice(0, 3)
  const remainingCount = blocks.length - displayedBlocks.length

  // Create an array of elements for AvatarGroup
  const avatarElements = [
    // Map the displayed blocks to Avatar components
    ...displayedBlocks.map((block) => (
      <Avatar
        key={block.name}
        //className="size-8 border-2 border-container items-center justify-center"
        // This is important for AvatarGroup to apply tooltips correctly
        data-tooltip-content={`${block.name} - ${block.category}`}
      >
        <AvatarFallback className='border border-border' style={{ backgroundColor: block.bgColor }}>
          {' '}
          {block.icon && <block.icon className='h-4 w-4 text-white' />}
        </AvatarFallback>

        {/* <AvatarFallback className="text-xs">{block.name[0]}</AvatarFallback> */}
        <AvatarGroupTooltip>{block.name}</AvatarGroupTooltip>
      </Avatar>
    )),
  ]

  // Add the remaining count indicator if needed
  if (remainingCount > 0) {
    avatarElements.push(
      <div
        className='flex size-6 items-center justify-center rounded-full border-2 border-container bg-sidebar text-xs'
        // Tooltip for the remaining count
        data-tooltip-content={`${remainingCount} more block${remainingCount > 1 ? 's' : ''}`}
      >
        +{remainingCount}
      </div>
    )
  }

  return (
    <AvatarGroup className='h-auto' delayDuration={0}>
      {avatarElements}
    </AvatarGroup>
  )
}
