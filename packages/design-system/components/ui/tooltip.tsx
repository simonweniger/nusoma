'use client'

import * as React from 'react'
import { cn } from '@nusoma/design-system/lib/utils'
import { AnimatePresence, motion, type Transition } from 'motion/react'
import { Tooltip as TooltipPrimitive } from 'radix-ui'

type TooltipContextType = {
  isOpen: boolean
}

const TooltipContext = React.createContext<TooltipContextType | undefined>(undefined)

const useTooltip = (): TooltipContextType => {
  const context = React.useContext(TooltipContext)
  if (!context) {
    throw new Error('useTooltip must be used within a Tooltip')
  }
  return context
}

type Side = 'top' | 'bottom' | 'left' | 'right'

const getInitialPosition = (side: Side) => {
  switch (side) {
    case 'top':
      return { y: 15 }
    case 'bottom':
      return { y: -15 }
    case 'left':
      return { x: 15 }
    case 'right':
      return { x: -15 }
  }
}

type TooltipProviderProps = React.ComponentProps<typeof TooltipPrimitive.Provider> & {
  /**
   * The delay duration for the tooltip to show
   * @default 700
   */
  delayDuration?: number
}

function TooltipProvider({ delayDuration, ...props }: TooltipProviderProps) {
  return (
    <TooltipPrimitive.Provider
      data-slot='tooltip-provider'
      delayDuration={delayDuration}
      {...props}
    />
  )
}

type TooltipProps = React.ComponentProps<typeof TooltipPrimitive.Root>

function Tooltip(props: TooltipProps) {
  const [isOpen, setIsOpen] = React.useState(props?.open ?? props?.defaultOpen ?? false)

  React.useEffect(() => {
    if (props?.open !== undefined) setIsOpen(props.open)
  }, [props?.open])

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      setIsOpen(open)
      props.onOpenChange?.(open)
    },
    [props]
  )

  return (
    <TooltipContext.Provider value={{ isOpen }}>
      <TooltipPrimitive.Root data-slot='tooltip' {...props} onOpenChange={handleOpenChange} />
    </TooltipContext.Provider>
  )
}

type TooltipTriggerProps = React.ComponentProps<typeof TooltipPrimitive.Trigger>

function TooltipTrigger(props: TooltipTriggerProps) {
  return <TooltipPrimitive.Trigger data-slot='tooltip-trigger' {...props} />
}

type TooltipContentProps = React.ComponentProps<typeof TooltipPrimitive.Content> & {
  transition?: Transition
  arrow?: boolean
  command?: string
  commandPosition?: 'inline' | 'below'
}

function TooltipContent({
  className,
  side = 'top',
  sideOffset = 4,
  transition = { type: 'spring', stiffness: 300, damping: 25 },
  arrow = true,
  children,
  command,
  commandPosition = 'inline',
  ...props
}: TooltipContentProps) {
  const { isOpen } = useTooltip()
  const initialPosition = getInitialPosition(side)

  return (
    <AnimatePresence>
      {isOpen && (
        <TooltipPrimitive.Portal forceMount data-slot='tooltip-portal'>
          <TooltipPrimitive.Content forceMount sideOffset={sideOffset} className='z-50' {...props}>
            <motion.div
              key='tooltip-content'
              data-slot='tooltip-content'
              initial={{ opacity: 0, scale: 0, ...initialPosition }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0, ...initialPosition }}
              transition={transition}
              className={cn(
                'relative w-fit origin-(--radix-tooltip-content-transform-origin) text-balance rounded-md bg-accent px-3 py-1.5 text-accent-foreground text-sm shadow-md',
                className
              )}
            >
              {children}

              {command && commandPosition === 'inline' && (
                <span className='pl-2 text-white/80 dark:text-black/70'>{command}</span>
              )}
              {command && commandPosition === 'below' && (
                <div className='pt-[1px] text-white/80 dark:text-black/70'>{command}</div>
              )}

              {arrow && (
                <TooltipPrimitive.Arrow
                  data-slot='tooltip-content-arrow'
                  className='z-50 size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-[2px] bg-accent fill-accent'
                />
              )}
            </motion.div>
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      )}
    </AnimatePresence>
  )
}

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  useTooltip,
  type TooltipContextType,
  type TooltipProps,
  type TooltipTriggerProps,
  type TooltipContentProps,
  type TooltipProviderProps,
}
