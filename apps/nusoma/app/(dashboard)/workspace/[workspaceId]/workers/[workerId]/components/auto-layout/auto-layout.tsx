'use client'

import { useCallback } from 'react'
import { Button } from '@nusoma/design-system/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@nusoma/design-system/components/ui/tooltip'
import { Layers } from 'lucide-react'
import { createLogger } from '@/lib/logger/console-logger'

const logger = createLogger('AutoLayout')

interface AutoLayoutProps {
  isExecuting: boolean
  isMultiRunning: boolean
  isDebugging: boolean
}

export function AutoLayout({ isExecuting, isMultiRunning, isDebugging }: AutoLayoutProps) {
  // Function to apply the auto layout
  const handleAutoLayoutClick = useCallback(() => {
    if (isExecuting || isMultiRunning || isDebugging) {
      return
    }

    window.dispatchEvent(new CustomEvent('trigger-auto-layout'))
  }, [isExecuting, isMultiRunning, isDebugging])

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          onClick={() => {
            // Show loading indicator or feedback that layout is being applied
            logger.info('Applying auto layout...')
            handleAutoLayoutClick()
          }}
          className='hover:text-primary'
          disabled={isExecuting || isMultiRunning || isDebugging}
        >
          <Layers className='h-5 w-5' />
          <span className='sr-only'>Auto Layout</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent command='Shift+L'>Auto Layout</TooltipContent>
    </Tooltip>
  )
}
