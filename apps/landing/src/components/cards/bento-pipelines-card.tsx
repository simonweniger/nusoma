'use client'

import type * as React from 'react'
import { cn } from '@nusoma/design-system/lib/utils'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { CardContent, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

const DATA = [
  {
    id: 'qualification',
    label: 'Qualification',
    percent: 100,
    value: 100,
  },
  {
    id: 'onboarding',
    label: 'Onboarding',
    percent: 71,
    value: 71,
  },
  {
    id: 'proposal',
    label: 'Proposal',
    percent: 40,
    value: 40,
  },
  {
    id: 'research',
    label: 'Research',
    percent: 16,
    value: 16,
  },
  {
    id: 'marketing',
    label: 'Marketing',
    percent: 7,
    value: 7,
  },
]

export function BentoPipelinesCard({
  className,
  ...other
}: React.ComponentPropsWithoutRef<typeof motion.div>): React.JSX.Element {
  return (
    <motion.div className={cn(className)} {...other}>
      <CardHeader className='px-4 py-2'>
        <h3 className='font-semibold text-lg tracking-tighter'>Projects</h3>
        <p className='text-muted-foreground'>
          Group multiple tasks in projects and track their progress. Your agent will work on each
          task until the project is completed.
        </p>
      </CardHeader>
      <CardContent className='mt-2 w-full'>
        <div className='relative w-full overflow-hidden'>
          <div className='group flex flex-col justify-between space-y-2'>
            {DATA.map((stage, index) => (
              <div key={stage.id}>
                <motion.div
                  className='flex items-center space-x-2 pr-4'
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Badge
                    id={`stage-${stage.label}`}
                    variant='secondary'
                    className='w-24 justify-center bg-secondary/20 text-secondary text-sm'
                  >
                    {stage.label}
                  </Badge>
                  <Progress
                    aria-labelledby={`stage-${stage.label}`}
                    value={stage.value}
                    className='flex-1'
                  />
                  <span className='w-8 text-right font-medium text-muted-foreground/80 text-sm'>
                    {stage.percent}%
                  </span>
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </motion.div>
  )
}
