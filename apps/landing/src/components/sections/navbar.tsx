'use client'

import { useEffect, useState } from 'react'
import { cn } from '@nusoma/design-system/lib/utils'
import { Menu, X } from 'lucide-react'
import { AnimatePresence, motion, useScroll } from 'motion/react'
import Image from 'next/image'
import Link from 'next/link'
import { Icons } from '@/components/icons'
import { NavMenu } from '@/components/nav-menu'
import { ThemeToggle } from '@/components/theme-toggle'
import { siteConfig } from '@/lib/config'

const INITIAL_WIDTH = '70rem'
const MAX_WIDTH = '800px'

// Animation variants
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

const drawerVariants = {
  hidden: { opacity: 0, y: 100 },
  visible: {
    opacity: 1,
    y: 0,
    rotate: 0,
    transition: {
      type: 'spring',
      damping: 15,
      stiffness: 200,
      staggerChildren: 0.03,
    },
  },
  exit: {
    opacity: 0,
    y: 100,
    transition: { duration: 0.1 },
  },
}

const drawerMenuContainerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const drawerMenuVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

export function Navbar() {
  const { scrollY } = useScroll()
  const [hasScrolled, setHasScrolled] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('hero')

  useEffect(() => {
    const handleScroll = () => {
      const sections = siteConfig.nav.links.map((item) => item.href.substring(1))

      for (const section of sections) {
        const element = document.getElementById(section)
        if (element) {
          const rect = element.getBoundingClientRect()
          if (rect.top <= 150 && rect.bottom >= 150) {
            setActiveSection(section)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const unsubscribe = scrollY.on('change', (latest) => {
      setHasScrolled(latest > 10)
    })
    return unsubscribe
  }, [scrollY])

  const toggleDrawer = () => setIsDrawerOpen((prev) => !prev)
  const handleOverlayClick = () => setIsDrawerOpen(false)

  return (
    <header
      className={cn(
        'sticky z-50 mx-4 flex justify-center transition-all duration-300 md:mx-0',
        hasScrolled ? 'top-6' : 'top-4 mx-0'
      )}
    >
      <motion.div
        initial={{ width: INITIAL_WIDTH }}
        animate={{ width: hasScrolled ? MAX_WIDTH : INITIAL_WIDTH }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div
          className={cn(
            'mx-auto max-w-7xl rounded-2xl transition-all duration-300 xl:px-0',
            hasScrolled
              ? 'border border-border bg-card/75 px-2 backdrop-blur-lg'
              : 'px-7 shadow-none'
          )}
        >
          <div className='flex h-[56px] items-center justify-between p-4'>
            <Link href='/' className='flex items-center gap-2'>
              <Image
                src='/logo.svg'
                alt='Logo'
                width={42}
                height={42}
                className='size-7 brightness-130'
              />
              {/* <Icons.logo className="size-7 md:size-10" /> */}
              <p className='font-bold text-lg text-primary'>nusoma</p>
            </Link>

            <NavMenu />

            <div className='flex shrink-0 flex-row items-center gap-1 md:gap-3'>
              <div className='flex items-center space-x-6'>
                <Link
                  className='hidden h-8 w-fit items-center justify-center rounded-full border border-white/[0.12] bg-secondary px-4 font-normal text-primary-foreground text-sm tracking-wide shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] md:flex dark:text-secondary-foreground'
                  href={siteConfig.nav.cta.href}
                >
                  {siteConfig.nav.cta.text}
                </Link>
              </div>
              <ThemeToggle />
              <button
                className='flex size-8 cursor-pointer items-center justify-center rounded-md border border-border md:hidden'
                onClick={toggleDrawer}
              >
                {isDrawerOpen ? <X className='size-5' /> : <Menu className='size-5' />}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              className='fixed inset-0 bg-black/50 backdrop-blur-sm'
              initial='hidden'
              animate='visible'
              exit='exit'
              variants={overlayVariants}
              transition={{ duration: 0.2 }}
              onClick={handleOverlayClick}
            />

            <motion.div
              className='fixed inset-x-0 bottom-3 mx-auto w-[95%] rounded-xl border border-border bg-background p-4 shadow-lg'
              initial='hidden'
              animate='visible'
              exit='exit'
              variants={drawerVariants}
            >
              {/* Mobile menu content */}
              <div className='flex flex-col gap-4'>
                <div className='flex items-center justify-between'>
                  <Link href='/' className='flex items-center gap-3'>
                    <Icons.logo className='size-7 md:size-10' />
                    <p className='font-semibold text-lg text-primary'>nusoma</p>
                  </Link>
                  <button
                    onClick={toggleDrawer}
                    className='cursor-pointer rounded-md border border-border p-1'
                  >
                    <X className='size-5' />
                  </button>
                </div>

                <motion.ul
                  className='mb-4 flex flex-col rounded-md border border-border text-sm'
                  variants={drawerMenuContainerVariants}
                >
                  <AnimatePresence>
                    {siteConfig.nav.links.map((item) => (
                      <motion.li
                        key={item.id}
                        className='border-border border-b p-2.5 last:border-b-0'
                        variants={drawerMenuVariants}
                      >
                        <a
                          href={item.href}
                          onClick={(e) => {
                            e.preventDefault()
                            const element = document.getElementById(item.href.substring(1))
                            element?.scrollIntoView({ behavior: 'smooth' })
                            setIsDrawerOpen(false)
                          }}
                          className={`underline-offset-4 transition-colors hover:text-primary/80 ${
                            activeSection === item.href.substring(1)
                              ? 'font-medium text-primary'
                              : 'text-primary/60'
                          }`}
                        >
                          {item.name}
                        </a>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </motion.ul>

                {/* Action buttons */}
                <div className='flex flex-col gap-2'>
                  <Link
                    href={siteConfig.nav.cta.href}
                    className='flex h-8 w-full items-center justify-center rounded-full border border-white/[0.12] bg-secondary px-4 font-normal text-primary-foreground text-sm tracking-wide shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] transition-all ease-out hover:bg-secondary/80 active:scale-95 dark:text-secondary-foreground'
                  >
                    {siteConfig.nav.cta.text}
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}
