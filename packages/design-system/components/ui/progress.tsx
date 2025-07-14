'use client'

import type * as React from 'react'
import { cn } from '@nusoma/design-system/lib/utils'
import { motion, type Transition } from 'motion/react'
import { Progress as ProgressPrimitive } from 'radix-ui'

const MotionProgressIndicator = motion.create(ProgressPrimitive.Indicator)

type ProgressProps = React.ComponentProps<typeof ProgressPrimitive.Root> & {
  transition?: Transition
}

function Progress({
  className,
  value,
  transition = { type: 'spring', stiffness: 100, damping: 30 },
  ...props
}: ProgressProps) {
  return (
    <ProgressPrimitive.Root
      data-slot='progress'
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-secondary', className)}
      value={value}
      {...props}
    >
      <MotionProgressIndicator
        data-slot='progress-indicator'
        className='h-full w-full flex-1 rounded-full bg-primary'
        animate={{ translateX: `-${100 - (value || 0)}%` }}
        transition={transition}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress, type ProgressProps }
