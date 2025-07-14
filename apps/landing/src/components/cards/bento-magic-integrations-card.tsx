/** biome-ignore-all lint/performance/noImgElement: needed here */
'use client'

import * as React from 'react'
import { cn } from '@nusoma/design-system/lib/utils'
import { motion } from 'framer-motion'
import { ArrowLeftRightIcon } from 'lucide-react'
import { CardContent, CardHeader } from '@/components/ui/card'
import AppleCalendar from '@/assets/features/apple-calendar.svg'
import GoogleCalendar from '@/assets/features/google-calendar.svg'
import OutlookCalendar from '@/assets/features/outlook-calendar.svg'

const DATA_MAGIC_INBOX = [
  { icon: AppleCalendar, alt: 'Apple Calendar', src: AppleCalendar },
  { icon: GoogleCalendar, alt: 'Google Calendar', src: GoogleCalendar },
  { icon: OutlookCalendar, alt: 'Outlook Calendar', src: OutlookCalendar },
]

export function BentoMagicInboxCard({
  className,
  ...other
}: React.ComponentPropsWithoutRef<typeof motion.div>): React.JSX.Element {
  const [active, setActive] = React.useState<number>(0)
  React.useEffect(() => {
    const interval = setInterval(() => {
      setActive((prev) => (prev + 1) % 3)
    }, 1000)

    return () => clearInterval(interval)
  }, [])
  return (
    <motion.div
      className={cn(
        '!justify-start relative flex h-full flex-col overflow-hidden border-none bg-background shadow-none ring-0 ring-offset-0',
        className
      )}
      {...other}
    >
      <CardHeader className='px-4 py-2'>
        <h3 className='font-semibold text-lg tracking-tighter'>Magic Integrations</h3>
        <p className='text-muted-foreground'>
          100+ of the most common business tools and apps are automatically integrated.
        </p>
      </CardHeader>
      <CardContent className='mt-6 w-full'>
        <div aria-hidden='true' className='pointer-events-none relative flex-auto select-none'>
          <div className='relative flex h-full flex-col items-center justify-center'>
            {/* Rings */}
            <div className='absolute blur-[1px]'>
              <div className='absolute top-1/2 left-1/2 mt-[calc(-216/2/16*1rem)] ml-[calc(-216/2/16*1rem)] size-[calc(216/16*1rem)] rounded-full border opacity-60 dark:opacity-100' />
              <div className='absolute top-1/2 left-1/2 mt-[calc(-280/2/16*1rem)] ml-[calc(-280/2/16*1rem)] size-[calc(280/16*1rem)] rounded-full border opacity-12.5 opacity-50 dark:opacity-90' />
              <div className='absolute top-1/2 left-1/2 mt-[calc(-344/2/16*1rem)] ml-[calc(-344/2/16*1rem)] size-[calc(344/16*1rem)] rounded-full border opacity-40 dark:opacity-80' />
              <div className='absolute top-1/2 left-1/2 mt-[calc(-408/2/16*1rem)] ml-[calc(-408/2/16*1rem)] size-[calc(408/16*1rem)] rounded-full border opacity-30 opacity-7.5 dark:opacity-70' />
            </div>
            {/* Icons */}
            <div className='flex flex-row gap-4'>
              {DATA_MAGIC_INBOX.map(({ icon, alt }, index) => (
                <div
                  key={index}
                  className={cn(
                    'transition duration-1000',
                    active === index ? 'opacity-100' : 'opacity-25'
                  )}
                >
                  <div className='size-10 overflow-hidden rounded-full border-2 border-background ring-1 ring-border/80'>
                    <img src={icon.src} alt={alt} width={36} height={36} className='rounded-full' />
                  </div>
                </div>
              ))}
            </div>
            <div className='relative aspect-[128/55] w-32'>
              {/* Connector */}
              <svg
                viewBox='0 0 128 55'
                fill='none'
                aria-hidden='true'
                className='absolute inset-0 size-full stroke-neutral-200 opacity-80 dark:stroke-neutral-800'
              >
                <path d='M64 0v25M8 0v8c0 8.837 7.163 16 16 16h24c8.837 0 16 7.163 16 16v15M120 0v8c0 8.837-7.163 16-16 16H80c-5.922 0-11.093 3.218-13.86 8' />
              </svg>
            </div>
            {/* Text */}
            <div className='mt-px flex flex-row items-center gap-2 whitespace-nowrap rounded-lg bg-secondary px-3 py-1.5 font-semibold text-primary-foreground text-xs dark:text-secondary-foreground'>
              Your Apps
              <ArrowLeftRightIcon className='size-3 shrink-0' />
              Your Worker
            </div>
          </div>
        </div>
      </CardContent>
    </motion.div>
  )
}
