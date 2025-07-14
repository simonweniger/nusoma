'use client'

import type * as React from 'react'
import { cn } from '@nusoma/design-system/lib/utils'
import { motion } from 'framer-motion'
import { TrendingUpIcon, UsersIcon } from 'lucide-react'
import { AvatarGroup } from '@/components/ui/avatar-group'
import { CardContent, CardHeader } from '@/components/ui/card'

const DATA = [
  {
    id: '1',
    name: 'Philip Grant',
    image: '/assets/features/philip_grant.webp',
  },
  {
    id: '2',
    name: 'Victoria Ballard',
    image: '/assets/features/victoria_ballard.webp',
  },
  {
    id: '3',
    name: 'Vivian Casey',
    image: '/assets/features/vivian_casey.webp',
  },
  {
    id: '4',
    name: 'Gabriel Fischer',
    image: '/assets/features/gabriel_fischer.webp',
  },
  {
    id: '5',
    name: 'Sofia Muller',
    image: '/assets/features/sofia_muller.webp',
  },
]

export function BentoCustomersCard({
  className,
  ...other
}: React.ComponentPropsWithoutRef<typeof motion.div>): React.JSX.Element {
  return (
    <motion.div
      className={cn(
        '!justify-start flex h-full w-full flex-col items-start overflow-hidden',
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      {...other}
    >
      <CardHeader className='w-full px-4 py-2'>
        <h3 className='font-semibold text-lg tracking-tighter'>Customers</h3>
        <p className='text-muted-foreground'>
          Organize your contact and resource data in one place.
        </p>
      </CardHeader>
      <CardContent className='w-full'>
        <div className='h-full space-y-10 rounded-lg border p-4 shadow'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-2'>
              <UsersIcon className='size-4 text-muted-foreground' />
              <span className='font-medium text-sm'>Total customers</span>
            </div>
            <motion.div
              className='flex items-center text-blue-500'
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <TrendingUpIcon className='mr-1 size-4' />
              <span className='font-semibold text-sm'>+12.5%</span>
            </motion.div>
          </div>
          <motion.div
            className='font-bold text-3xl'
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            1,234
          </motion.div>
          <div className='flex gap-1'>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <AvatarGroup max={5} showOverflowCount={false} size='sm' avatars={DATA} />
            </motion.div>
          </div>
        </div>
      </CardContent>
    </motion.div>
  )
}
