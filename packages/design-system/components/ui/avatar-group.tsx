'use client'

import * as React from 'react'
import {
  Tooltip,
  TooltipContent,
  type TooltipContentProps,
  type TooltipProps,
  TooltipProvider,
  TooltipTrigger,
} from '@nusoma/design-system/components/ui/tooltip'
import { cn } from '@nusoma/design-system/lib/utils'
import { motion, type Transition } from 'motion/react'

type AvatarProps = TooltipProps & {
  children: React.ReactNode
  zIndex: number
  transition: Transition
  translate: string | number
}

function AvatarContainer({ children, zIndex, transition, translate, ...props }: AvatarProps) {
  return (
    <Tooltip {...props}>
      <TooltipTrigger>
        <motion.div
          data-slot='avatar-container'
          initial='initial'
          whileHover='hover'
          whileTap='hover'
          className='relative'
          style={{ zIndex }}
        >
          <motion.div
            variants={{
              initial: { translateY: 0 },
              hover: { translateY: translate },
            }}
            transition={transition}
          >
            {children}
          </motion.div>
        </motion.div>
      </TooltipTrigger>
    </Tooltip>
  )
}

type AvatarGroupTooltipProps = TooltipContentProps

function AvatarGroupTooltip(props: AvatarGroupTooltipProps) {
  return <TooltipContent {...props} />
}

type AvatarGroupProps = Omit<React.ComponentProps<'div'>, 'translate'> & {
  showoverflowcount?: boolean // Added to type definition
  children: React.ReactElement[]
  transition?: Transition
  invertOverlap?: boolean
  translate?: string | number
  tooltipProps?: Omit<TooltipProps, 'children'>
  /**
   * The delay duration for tooltips to show
   * @default 0
   */
  delayDuration?: number
}

function AvatarGroup({
  ref,
  children,
  className,
  transition = { type: 'spring', stiffness: 300, damping: 17 },
  invertOverlap = false,
  translate = '-30%',
  delayDuration = 0,
  showoverflowcount, // Destructured to prevent passing to div
  ...props
}: AvatarGroupProps) {
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <div
        ref={ref}
        data-slot='avatar-group'
        className={cn('-space-x-2 flex h-8 flex-row items-center', className)}
        {...props}
      >
        {children?.map((child, index) => (
          <AvatarContainer
            key={index}
            zIndex={invertOverlap ? React.Children.count(children) - index : index}
            transition={transition}
            translate={translate}
          >
            {child}
          </AvatarContainer>
        ))}
      </div>
    </TooltipProvider>
  )
}

export { AvatarGroup, AvatarGroupTooltip, type AvatarGroupProps, type AvatarGroupTooltipProps }
