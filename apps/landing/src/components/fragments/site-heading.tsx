import type * as React from 'react'
import { Badge } from '@/components/ui/badge'

export type SiteHeadingProps = {
  badge?: React.ReactNode
  title?: React.ReactNode
  description?: React.ReactNode
}

export function SiteHeading({ badge, title, description }: SiteHeadingProps): React.JSX.Element {
  return (
    <div className='mx-auto flex max-w-5xl flex-col items-center gap-6 text-center'>
      {badge && (
        <Badge variant='outline' className='h-8 rounded-full px-3 font-medium text-sm shadow-sm'>
          {badge}
        </Badge>
      )}
      {title && <h1 className='text-pretty font-bold text-5xl lg:text-6xl'>{title}</h1>}
      {description && <p className='text-lg text-muted-foreground lg:text-xl'>{description}</p>}
    </div>
  )
}
