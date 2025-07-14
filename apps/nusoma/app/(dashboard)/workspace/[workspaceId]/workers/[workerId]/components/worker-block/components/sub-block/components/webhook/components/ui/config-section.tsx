import type React from 'react'
import { cn } from '@nusoma/design-system/lib/utils'

interface ConfigSectionProps {
  title?: string
  children: React.ReactNode
  className?: string
}

export function ConfigSection({ title, children, className }: ConfigSectionProps) {
  return (
    <div
      className={cn(
        'space-y-4 rounded-md border border-border bg-card p-4 shadow-elevation-low',
        className
      )}
    >
      {children}
    </div>
  )
}
