import { useCallback } from 'react'
import { Card, CardContent, CardTitle } from '@nusoma/design-system/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@nusoma/design-system/components/ui/tooltip'
import type { BlockConfig } from '@/blocks/types'

export type ToolbarBlockProps = {
  config: BlockConfig
}

export function ToolbarBlock({ config }: ToolbarBlockProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type: config.type }))
    e.dataTransfer.effectAllowed = 'move'
  }

  // Handle click to add block
  const handleClick = useCallback(() => {
    if (config.type === 'connectionBlock') {
      return
    }

    // Dispatch a custom event to be caught by the worker component
    const event = new CustomEvent('add-block-from-toolbar', {
      detail: {
        type: config.type,
      },
    })
    window.dispatchEvent(event)
  }, [config.type])

  return (
    <Card
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
      className='cursor-pointer shadow-elevation-low transition-shadow duration-200 hover:shadow-none'
    >
      <Tooltip>
        <CardContent className='flex flex-row items-center gap-1 p-2'>
          <TooltipTrigger>
            <div // Outer container for layout and dimensions
              className='relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg'
            >
              <div // Inner div for transparent background + backdrop
                className='absolute inset-0 rounded-lg' // Match parent's rounding
                style={{
                  backgroundColor: config.bgColor,
                  opacity: 0.3, // Opacity only affects this background element
                  backdropFilter: 'blur(5px)',
                }}
              />
              <config.icon // Icon, now sits above the background element
                className={`relative z-[1] transition-transform duration-200 group-hover:scale-110 ${
                  config.type === 'agent' ? 'h-[24px] w-[24px]' : 'h-[22px] w-[22px]'
                }`}
                style={{ color: config.bgColor }} // Icon color is solid config.bgColor
              />
            </div>
          </TooltipTrigger>

          <div className='flex flex-col gap-1'>
            <CardTitle className='font-medium text-base text-foreground leading-none'>
              {config.name}
            </CardTitle>
            {/* <p className="text-muted-foreground text-sm leading-snug">{config.description}</p> */}
          </div>
        </CardContent>
        <TooltipContent>{config.description}</TooltipContent>
      </Tooltip>
    </Card>
  )
}
