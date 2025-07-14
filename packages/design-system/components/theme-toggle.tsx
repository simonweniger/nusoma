'use client'

import { cn } from '@nusoma/design-system/lib/utils'
import { LaptopIcon, MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'

const ITEMS = [
  { icon: <SunIcon className='size-3' />, theme: 'light' },
  { icon: <MoonIcon className='size-3' />, theme: 'dark' },
  { icon: <LaptopIcon className='size-3' />, theme: 'system' },
]

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <div className='flex items-center gap-px rounded-lg border border-neutral-300/80 bg-[#eeeeee] p-px dark:border-neutral-800/40 dark:bg-[#111111]'>
      {ITEMS.map(({ icon, theme: itemTheme }, idx) => (
        <button
          key={idx}
          onClick={() => setTheme(itemTheme)}
          className='relative flex h-[18px] w-[20px] items-center justify-center rounded-[6px] outline-none focus-visible:ring-1 focus-visible:ring-neutral-300/80 dark:focus-visible:ring-neutral-800'
        >
          <div
            className={cn(
              'relative z-[1] transition-all hover:scale-110 hover:cursor-pointer',
              theme === itemTheme
                ? 'text-black dark:text-white'
                : 'text-neutral-400 dark:text-neutral-600'
            )}
          >
            {icon}
          </div>
          {theme === itemTheme && (
            <div className='absolute inset-0 rounded-[inherit] bg-[#dddddd] dark:bg-[#222222]' />
          )}
        </button>
      ))}
    </div>
  )
}
