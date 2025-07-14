import Image from 'next/image'
import Link from 'next/link'
import { siteConfig } from '@/lib/config'

export function CTASection() {
  const { ctaSection } = siteConfig

  return (
    <section id='cta' className='flex w-full flex-col items-center justify-center'>
      <div className='w-full'>
        <div className='relative z-20 h-[450px] w-full overflow-hidden rounded-xl border border-border bg-secondary shadow-xl md:h-[450px]'>
          <Image
            src={ctaSection.backgroundImage}
            alt='Agent CTA Background'
            className='absolute inset-0 h-full w-full object-cover object-center opacity-20'
            fill
            priority
          />
          <div className='-top-32 md:-top-5 absolute inset-0 flex flex-col items-center justify-center '>
            <h1 className='max-w-xs text-center font-medium text-4xl text-white tracking-tighter md:max-w-xl md:text-7xl'>
              {ctaSection.title}
            </h1>
            <Link
              href={ctaSection.button.href}
              className='mt-10 flex h-10 w-fit items-center justify-center rounded-full bg-white px-4 font-semibold text-black text-sm shadow-md'
            >
              {ctaSection.button.text}
            </Link>
            {/* <span className='text-sm text-white'>{ctaSection.subtext}</span> */}
          </div>
        </div>
      </div>
    </section>
  )
}
