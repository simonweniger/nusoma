import type * as React from 'react'
import {
  CalendarIcon,
  DollarSignIcon,
  GlobeIcon,
  LineChartIcon,
  MapPinIcon,
  TagsIcon,
  User2Icon,
} from 'lucide-react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import personImage from '@/assets/images/person.png'

export function AiAdvisorCard(props: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <Card {...props}>
      <CardContent className='pt-6'>
        <div className='mb-6 flex flex-col items-start gap-4'>
          <Image
            src={personImage}
            alt='Alex "Syntax" Cypher - AI Worker'
            width={48}
            height={48}
            className='rounded-full border-2 border-border'
          />
          {/* <h2 className='font-semibold text-lg'>Alex 'Syntax' Cypher</h2> */}
        </div>
        <div className='space-y-3'>
          <div className='flex items-center gap-2.5'>
            <User2Icon className='size-4 text-muted-foreground' />
            <span className='w-24 text-muted-foreground text-sm'>Name</span>
            <span className='text-sm'>Alex Cypher</span>
          </div>
          <div className='flex items-center gap-3'>
            <GlobeIcon className='size-4 text-muted-foreground' />
            <span className='w-24 text-muted-foreground text-sm'>Title</span>
            <p className='text-sm'>Content Strategist & Copywriter</p>
          </div>
          <div className='flex items-center gap-2.5'>
            <MapPinIcon className='size-4 text-muted-foreground' />
            <span className='w-24 text-muted-foreground text-sm'>Specialization</span>
            <span className='text-sm'>Marketing & Sales Copy</span>
          </div>
          <div className='flex items-center gap-2.5'>
            <TagsIcon className='size-4 text-muted-foreground' />
            <span className='w-24 text-muted-foreground text-sm'>Skills</span>
            <div className='flex gap-1'>
              <Badge variant='secondary' className='whitespace-nowrap pl-2 text-xs'>
                Content Strategy
              </Badge>
              <Badge variant='secondary' className='whitespace-nowrap pl-2 text-xs'>
                Copywriting
              </Badge>
              <Badge variant='secondary' className='whitespace-nowrap pl-2 text-xs'>
                SEO
              </Badge>
            </div>
          </div>
          <div className='flex items-center gap-2.5'>
            <CalendarIcon className='size-4 text-muted-foreground' />
            <span className='w-24 text-muted-foreground text-sm'>Availability</span>
            <span className='text-sm'>24/7</span>
          </div>
          <div className='flex items-center gap-2.5'>
            <LineChartIcon className='size-4 text-muted-foreground' />
            <span className='w-24 text-muted-foreground text-sm'>Projects</span>
            <span className='text-sm'>120+</span>
          </div>
          <div className='flex items-center gap-2.5'>
            <DollarSignIcon className='size-4 text-muted-foreground' />
            <span className='w-24 text-muted-foreground text-sm'>Rate</span>
            <span className='text-sm'>$4/hour</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className='flex-col items-start space-y-2 rounded-b-xl bg-neutral-50 pt-6 dark:bg-neutral-900'>
        <h3 className='font-semibold text-base sm:text-lg'>AI Content Strategist & Copywriter</h3>
        <div className='max-w-md text-muted-foreground text-sm'>
          Alex is a highly creative AI assistant specializing in crafting compelling narratives and
          marketing copy that resonates with target audiences. Proficient in leveraging advanced
          language models for content ideation and execution.{' '}
        </div>
      </CardFooter>
    </Card>
  )
}
