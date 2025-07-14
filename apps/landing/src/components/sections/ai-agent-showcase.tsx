import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { siteConfig } from '@/lib/config'

export function AgentShowcase() {
  const { companyShowcase } = siteConfig
  return (
    <section
      id='company'
      className='relative flex w-full flex-col items-center justify-center gap-10 px-6 py-22'
    >
      <p className='font-medium text-muted-foreground'>All your Agents in one place</p>
      <div className='z-20 grid w-full max-w-7xl grid-cols-2 items-center justify-center overflow-hidden border-border border-y md:grid-cols-4'>
        {companyShowcase.companyLogos.map((logo) => (
          <Link
            href='#'
            className="group before:-left-1 after:-top-1 relative flex h-28 w-full items-center justify-center p-4 before:absolute before:top-0 before:z-10 before:h-screen before:w-px before:bg-border before:content-[''] after:absolute after:left-0 after:z-10 after:h-px after:w-screen after:bg-border after:content-['']"
            key={logo.id}
          >
            <div className='0.84, 0.44, 1)] group-hover:-translate-y-4 flex h-full w-full translate-y-0 items-center justify-center transition-all duration-300 [cubic-bezier(0.165,'>
              {logo.logo}
            </div>
            <div className='0.84, 0.44, 1)] absolute inset-0 flex translate-y-8 items-center justify-center opacity-0 transition-all duration-300 ease-[cubic-bezier(0.165, group-hover:translate-y-4 group-hover:opacity-100'>
              <span className='flex items-center gap-2 font-medium text-sm'>
                Learn More <ArrowRight className='h-4 w-4' />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
