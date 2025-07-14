'use client'

import * as React from 'react'
import { cn } from '@nusoma/design-system/lib/utils'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

export type TooltipProviderProps = React.ComponentProps<typeof TooltipPrimitive.Provider>
const TooltipProvider = TooltipPrimitive.Provider

export type TooltipProps = React.ComponentProps<typeof TooltipPrimitive.Root>
const Tooltip = TooltipPrimitive.Root

export type TooltipTriggerElement = React.ElementRef<typeof TooltipPrimitive.Trigger>
export type TooltipTriggerProps = React.ComponentProps<typeof TooltipPrimitive.Trigger>
const TooltipTrigger = TooltipPrimitive.Trigger

export type TooltipContentElement = React.ElementRef<typeof TooltipPrimitive.Content>
export type TooltipContentProps = React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
const TooltipContent = React.forwardRef<TooltipContentElement, TooltipContentProps>(
  ({ className, sideOffset = 4, ...props }, ref) => (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          'fade-in-0 zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 animate-in overflow-hidden rounded-md bg-primary px-3 py-1.5 text-primary-foreground text-xs data-[state=closed]:animate-out',
          className
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  )
)
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
