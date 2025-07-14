import type * as React from 'react'
import { CircleCheckBigIcon } from 'lucide-react'
import { AiAdvisorCard } from '@/components/cards/ai-advisor-card'
import { BentoCampaignsCard } from '@/components/cards/bento-campaigns-card'
//import { BentoCustomersCard } from '@/components/cards/bento-customers-card'
import { BentoPipelinesCard } from '@/components/cards/bento-pipelines-card'
import { siteConfig } from '@/lib/config'
import { BentoMagicInboxCard } from '../cards/bento-magic-integrations-card'
import { SectionHeader } from '../section-header'
import { Pointer } from '../ui/pointer'

export function Solution(): React.JSX.Element {
  return (
    <section
      id='bento'
      className='relative flex w-full flex-col items-center justify-center border-b px-5 md:px-10'
    >
      <Pointer className='fill-primary dark:fill-secondary' />

      <div className='relative w-full sm:border-x md:mx-10 lg:w-auto'>
        <div className='-left-4 md:-left-14 absolute top-0 h-full w-4 bg-[size:10px_10px] text-primary/5 [background-image:repeating-linear-gradient(315deg,currentColor_0_1px,#0000_0_50%)] md:w-14' />
        <div className='-right-4 md:-right-14 absolute top-0 h-full w-4 bg-[size:10px_10px] text-primary/5 [background-image:repeating-linear-gradient(315deg,currentColor_0_1px,#0000_0_50%)] md:w-14' />

        <SectionHeader>
          <h2 className='text-balance pb-1 text-center font-medium text-3xl tracking-tighter md:text-4xl'>
            {siteConfig.solution.title}
          </h2>
          <p className='text-balance font-medium text-muted-foreground'>
            {siteConfig.solution.description}
          </p>
        </SectionHeader>

        <div className='grid grid-cols-1 divide-x divide-border overflow-hidden border-y md:grid-cols-3'>
          {/* <BentoCustomersCard
              className="flex flex-col items-start justify-end p-0.5 relative before:absolute before:-left-0.5 before:top-0 before:z-10 before:h-screen before:w-px before:bg-border before:content-[''] after:absolute after:-top-0.5 after:left-0 after:z-10 after:h-px after:w-screen after:bg-border after:content-[''] group cursor-pointer max-h-[400px] group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            /> */}
          <BentoPipelinesCard
            className="before:-left-0.5 after:-top-0.5 group group relative flex h-full max-h-[500px] flex-col items-start justify-end p-0.5 before:absolute before:top-0 before:z-10 before:h-screen before:w-px before:bg-border before:content-[''] after:absolute after:left-0 after:z-10 after:h-px after:w-screen after:bg-border after:content-[''] sm:max-h-[400px]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          />
          <BentoCampaignsCard
            className="before:-left-0.5 after:-top-0.5 group group relative flex h-full max-h-[500px] flex-col items-start justify-end p-0.5 before:absolute before:top-0 before:z-10 before:h-screen before:w-px before:bg-border before:content-[''] after:absolute after:left-0 after:z-10 after:h-px after:w-screen after:bg-border after:content-[''] sm:max-h-[400px]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          />
          <BentoMagicInboxCard
            className="before:-left-0.5 after:-top-0.5 group group relative flex h-96 cursor-pointer flex-col items-start justify-end p-0.5 before:absolute before:top-0 before:z-10 before:h-screen before:w-px before:bg-border before:content-[''] after:absolute after:left-0 after:z-10 after:h-px after:w-screen after:bg-border after:content-[''] sm:max-h-[400px]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          />
        </div>
        <div className='flex flex-row items-center justify-center gap-12 p-10'>
          <div className='order-2 flex flex-col items-center justify-center gap-6 md:order-1'>
            <div>
              <h2 className='text-balance pb-1 font-medium text-3xl tracking-tighter md:text-4xl'>
                {siteConfig.solution.secondaryTitle}
              </h2>
              <p className='text-balance font-medium text-muted-foreground'>
                {siteConfig.solution.secondaryDescription}
              </p>
            </div>

            <ul className='mt-6 list-none flex-wrap items-center gap-6 space-y-3 md:flex md:space-y-0'>
              {siteConfig.solution.features.map((feature) => (
                <li key={feature} className='flex flex-row items-center gap-2'>
                  <CircleCheckBigIcon className='size-4 shrink-0 text-primary' />
                  <span className='font-medium'>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className='hidden sm:block'>
            <AiAdvisorCard />
          </div>
        </div>
      </div>
    </section>
  )
}
