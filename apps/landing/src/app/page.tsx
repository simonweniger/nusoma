//import { AgentShowcase } from '@/components/sections/ai-agent-showcase'
import { BentoSection } from '@/components/sections/bento-section'
//import { CompanyShowcase } from '@/components/sections/company-showcase'
import { CTASection } from '@/components/sections/cta-section'
import { FAQSection } from '@/components/sections/faq-section'
import { FooterSection } from '@/components/sections/footer-section'
import { GrowthSection } from '@/components/sections/growth-section'
import { HeroSection } from '@/components/sections/hero-section'
import { PricingSection } from '@/components/sections/pricing-section'
import { Problem } from '@/components/sections/problem'
import { Solution } from '@/components/sections/solution'
//import { TestimonialSection } from '@/components/sections/testimonial-section'

export default function Home() {
  return (
    <main className='flex min-h-screen w-full flex-col items-center justify-center'>
      <HeroSection />
      <Problem />
      {/* <CompanyShowcase /> */}
      {/* <Stats /> */}
      <BentoSection />
      <Solution />
      {/* <AgentShowcase /> */}

      {/* <QuoteSection /> */}
      {/* <FeatureSection /> */}
      <GrowthSection />
      <PricingSection />
      {/* <TestimonialSection /> */}
      <FAQSection />
      <CTASection />
      <FooterSection />
    </main>
  )
}
