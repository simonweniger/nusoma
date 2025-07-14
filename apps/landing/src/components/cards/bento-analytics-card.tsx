'use client'

import type * as React from 'react'
import { cn } from '@nusoma/design-system/lib/utils'
import { motion } from 'framer-motion'
import { Area, AreaChart } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../ui/chart'

/* eslint-disable @typescript-eslint/no-explicit-any */

const DATA = [
  { name: 'January', value: 400 },
  { name: 'February', value: 300 },
  { name: 'March', value: 600 },
  { name: 'April', value: 400 },
  { name: 'May', value: 500 },
  { name: 'June', value: 350 },
]

const MotionCard = motion.create(Card as any)

export function BentoAnalyticsCard({
  className,
  ...other
}: React.ComponentPropsWithoutRef<typeof MotionCard>): React.JSX.Element {
  return (
    <MotionCard
      className={cn('relative h-[300px] max-h-[300px] overflow-hidden', className)}
      {...other}
    >
      <CardHeader className='px-4 py-2'>
        <CardTitle className='font-semibold text-xl'>Analytics</CardTitle>
        <CardDescription className='mb-6 line-clamp-2 text-muted-foreground text-sm'>
          Get instant insights into your business performance.
        </CardDescription>
      </CardHeader>
      <CardContent className='overflow-hidden p-0'>
        <div className='w-full max-w-md'>
          <ChartContainer config={{}} className='h-[150px] min-w-full overflow-hidden'>
            <AreaChart data={DATA} margin={{ top: 5, right: 0, left: 0, bottom: -5 }}>
              <defs>
                <linearGradient id='gradient' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0%' stopColor='oklch(var(--primary))' stopOpacity={0.2} />
                  <stop offset='100%' stopColor='oklch(var(--primary))' stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type='monotone'
                dataKey='value'
                label='Leads'
                stroke='oklch(var(--primary))'
                fill='url(#gradient)'
                strokeWidth={2}
                isAnimationActive={false}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className='w-[150px]'
                    labelFormatter={(_, payload) => payload[0].payload.name}
                    formatter={(value) => (
                      <>
                        <strong>{value}</strong> Leads
                      </>
                    )}
                  />
                }
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </CardContent>
    </MotionCard>
  )
}
