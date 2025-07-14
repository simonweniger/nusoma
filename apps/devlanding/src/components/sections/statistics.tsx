'use client'

import Link from 'next/link'
import { Icons } from '@/components/icons'
import { Section } from '@/components/section'
import { BorderText } from '@/components/ui/border-number'

const stats = [
  {
    title: '10K+',
    subtitle: 'Stars on GitHub',
    icon: <Icons.github className='h-5 w-5' />,
  },
  {
    title: '50K+',
    subtitle: 'Discord Members',
    icon: <Icons.discord className='h-5 w-5' />,
  },
  {
    title: '1M+',
    subtitle: 'Downloads',
    icon: <Icons.npm className='h-5 w-5' />,
  },
]

export function Statistics() {
  return (
    <Section id='statistics' title='Statistics'>
      <div
        className='border-x border-t'
        style={{
          backgroundImage:
            'radial-gradient(circle at bottom center, hsl(var(--secondary) / 0.4), hsl(var(--background)))',
        }}
      >
        <div className='grid grid-cols-1 sm:grid-cols-3'>
          {stats.map((stat, idx) => (
            <Link
              href='#'
              key={idx}
              className='group relative flex flex-col items-center justify-center overflow-hidden border-b px-4 py-8 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0 [&:nth-child(-n+2)]:border-t-0 sm:[&:nth-child(-n+3)]:border-t-0'
            >
              <div className='-translate-y-full absolute top-2 right-2 translate-x-full transform opacity-0 transition-all duration-300 ease-in-out group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  width='24'
                  height='24'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                >
                  <line x1='7' y1='17' x2='17' y2='7' />
                  <polyline points='7 7 17 7 17 17' />
                </svg>
              </div>
              <div className='relative text-center'>
                <BorderText text={stat.title} />
                <div className='mt-2 flex items-center justify-center gap-2'>
                  {stat.icon}
                  <p className='text-muted-foreground text-sm'>{stat.subtitle}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Section>
  )
}
