import type * as React from 'react'
import { BlurFade } from '@/components/fragments/blur-fade'
import { siteConfig } from '@/lib/config'

export function Problem(): React.JSX.Element {
  return (
    <div className='mx-6 bg-card'>
      <div className='grid divide-y border-y border-dashed md:grid-cols-3 md:divide-x md:divide-y-0'>
        {siteConfig.problems.map((problem, index) => (
          <BlurFade
            key={index}
            inView
            delay={0.2 + index * 0.2}
            className='border-dashed px-8 py-12'
          >
            <div className='mb-7 flex size-12 items-center justify-center rounded-2xl bg-background shadow'>
              {problem.icon}
            </div>
            <h3 className='mb-3 font-semibold text-lg'>{problem.title}</h3>
            <p className='text-muted-foreground'>{problem.description}</p>
          </BlurFade>
        ))}
      </div>
    </div>
  )
}
