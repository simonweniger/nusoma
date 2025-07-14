'use client'

import * as React from 'react'
import { cn } from '@nusoma/design-system/lib/utils'
import { motion } from 'framer-motion'
import { CheckIcon, MailIcon, MessageSquareIcon } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Carousel, type CarouselApi, CarouselContent, CarouselItem } from '@/components/ui/carousel'

const DATA = [
  {
    type: 'email',
    icon: MailIcon,
    title: 'Welcome Email',
    timing: 'Sent upon customer registration',
  },
  {
    type: 'message',
    icon: MessageSquareIcon,
    title: 'Appointment Reminder',
    timing: '24 hours before appointment',
  },
  {
    type: 'email',
    icon: MailIcon,
    title: 'Follow-up Email',
    timing: '2 days after initial contact',
  },
  {
    type: 'message',
    icon: MessageSquareIcon,
    title: 'Feedback Request',
    timing: '48 hours after service completion',
  },
  {
    type: 'email',
    icon: MailIcon,
    title: 'Exclusive Offer Email',
    timing: 'Sent 7 days after inactivity',
  },
  {
    type: 'message',
    icon: MessageSquareIcon,
    title: 'Personalized Check-in',
    timing: '30 days after last interaction',
  },
  {
    type: 'email',
    icon: MailIcon,
    title: 'Special Event Invitation',
    timing: '14 days before the event',
  },
  {
    type: 'message',
    icon: MessageSquareIcon,
    title: 'Reactivation Campaign',
    timing: '90 days after inactivity',
  },
]

export function BentoCampaignsCard({
  className,
  ...other
}: React.ComponentPropsWithoutRef<typeof motion.div>): React.JSX.Element {
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [showCheckmark, setShowCheckmark] = React.useState(false)
  const [carouselApi, setCarouselApi] = React.useState<CarouselApi | null>(null)

  // Handle the animation sequence
  const animateAndAdvance = React.useCallback(() => {
    // 1. Show checkmark
    setShowCheckmark(true)

    // 2. Wait for animation, then advance carousel
    setTimeout(() => {
      // Reset checkmark immediately before carousel moves
      setShowCheckmark(false)

      // Then move the carousel
      carouselApi?.scrollNext()
    }, 500)
  }, [carouselApi])

  // Set up timer for animation sequence
  React.useEffect(() => {
    if (!carouselApi) {
      return
    }

    const interval = setInterval(() => {
      animateAndAdvance()
    }, 3000) // Total cycle time

    return () => clearInterval(interval)
  }, [carouselApi, animateAndAdvance])

  return (
    <motion.div className={cn('relative overflow-hidden', className)} {...other}>
      <CardHeader className='px-4 py-2'>
        <h3 className='font-semibold text-lg tracking-tighter'>24/7 Task Queue</h3>
        <p className='text-muted-foreground'>
          Your AI agents work around the clock on the tasks you assign them.
        </p>
      </CardHeader>
      <CardContent className='w-full'>
        <Carousel
          opts={{
            align: 'start',
            loop: true,
          }}
          // Remove autoplay plugin as we're manually controlling the carousel
          orientation='vertical'
          className='pointer-events-none size-full select-none'
          setApi={(api) => {
            if (api) {
              setCarouselApi(api)
              api.on('select', () => {
                const newIndex = api.selectedScrollSnap()
                if (currentIndex !== newIndex) {
                  // Ensure checkmark is off when slide changes
                  setShowCheckmark(false)
                  setCurrentIndex(newIndex)
                }
              })
            }
          }}
        >
          <CarouselContent className='pointer-events-none mt-0.5 h-[232px] select-none sm:h-[210px]'>
            {DATA.map(({ title, icon: Icon }, index) => (
              <CarouselItem
                key={index}
                className='pointer-events-none basis-1/4 select-none pt-1 will-change-transform'
              >
                <Card className='m-1'>
                  <CardContent className='flex w-full flex-row items-center justify-start gap-4 p-6'>
                    <div className='rounded-full bg-primary p-2 text-primary-foreground dark:bg-secondary dark:text-secondary-foreground'>
                      {index === currentIndex && showCheckmark ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <CheckIcon className='size-5 shrink-0' />
                        </motion.div>
                      ) : (
                        <Icon className='size-5 shrink-0' />
                      )}
                    </div>
                    <div>
                      <div className='font-medium text-xs sm:text-sm'>{title}</div>
                      <div className='text-[10px] text-muted-foreground sm:text-xs'>
                        {index === currentIndex && showCheckmark ? 'Done' : 'Working on it...'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </CardContent>
    </motion.div>
  )
}
