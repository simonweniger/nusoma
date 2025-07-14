import { cn } from '@nusoma/design-system/lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='skeleton'
      className={cn('animate-pulse rounded-md bg-muted/30', className)}
      {...props}
    />
  )
}

export { Skeleton }
