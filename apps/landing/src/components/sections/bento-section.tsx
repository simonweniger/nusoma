'use client'

import { SectionHeader } from '@/components/section-header'
import { siteConfig } from '@/lib/config'
import { Pointer } from '../ui/pointer'

export function BentoSection() {
  const { title, description, items } = siteConfig.bentoSection

  return (
    <section
      id='bento'
      className='relative flex w-full flex-col items-center justify-center border-b px-5 md:px-10'
    >
      <Pointer className='fill-primary dark:fill-secondary' />

      <div className='relative sm:mx-5 sm:border-x md:mx-10'>
        <div className='-left-4 md:-left-14 absolute top-0 h-full w-4 bg-[size:10px_10px] text-primary/5 [background-image:repeating-linear-gradient(315deg,currentColor_0_1px,#0000_0_50%)] md:w-14' />
        <div className='-right-4 md:-right-14 absolute top-0 h-full w-4 bg-[size:10px_10px] text-primary/5 [background-image:repeating-linear-gradient(315deg,currentColor_0_1px,#0000_0_50%)] md:w-14' />

        <SectionHeader>
          <h2 className='text-balance pb-1 text-center font-medium text-3xl tracking-tighter md:text-4xl'>
            {title}
          </h2>
          <p className='text-balance text-center font-medium text-muted-foreground'>
            {description}
          </p>
        </SectionHeader>

        <div className='grid grid-cols-1 overflow-hidden md:grid-cols-2'>
          {items.map((item) => (
            <div
              key={item.id}
              className="before:-left-0.5 after:-top-0.5 group group relative flex max-h-[400px] min-h-[600px] flex-col items-start justify-end p-0.5 before:absolute before:top-0 before:z-10 before:h-screen before:w-px before:bg-border before:content-[''] after:absolute after:left-0 after:z-10 after:h-px after:w-screen after:bg-border after:content-[''] md:min-h-[500px]"
            >
              <div className='relative flex size-full h-full items-center justify-center overflow-hidden'>
                {item.content}
              </div>
              <div className='flex-1 flex-col gap-2 p-6'>
                <h3 className='font-semibold text-lg tracking-tighter'>{item.title}</h3>
                <p className='text-muted-foreground'>{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
