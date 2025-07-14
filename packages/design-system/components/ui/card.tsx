import * as React from 'react'
import { cn } from '@nusoma/design-system/lib/utils'

const CardStyled = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('rounded-[24px] border border-border/60 bg-card', className)}
    {...props}
  >
    {/* Nested structure for aesthetic borders */}
    <div className='rounded-[23px] border border-border/10 '>
      <div className='rounded-[22px] border border-border/10'>
        <div className='rounded-[21px] border border-border/10'>
          {/* Inner content wrapper */}
          <div className=' w-full rounded-[20px] border border-border/10 text-neutral-500 '>
            {children}
          </div>
        </div>
      </div>
    </div>
  </div>
))

// Allows for global css overrides and theme support - similar to shad cn
export type CardElement = HTMLDivElement
export type CardProps = React.HTMLAttributes<HTMLDivElement>
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('rounded-xl border border-border/60 bg-card', className)}
      {...props}
    >
      <div className='rounded-[calc(var(--radius)-1px)] border border-border/10'>
        <div className='rounded-[calc(var(--radius)-2px)] border border-border/10'>
          <div className='rounded-[calc(var(--radius)-3px)] border border-border/10'>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
})

Card.displayName = 'Card'
export type CardHeaderElement = HTMLDivElement
export type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>
const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'first:pt-6 last:pb-6 ', // Adjust padding for first and last child
        className
      )}
      {...props}
    />
  )
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('pl-2 font-semibold text-lg text-muted-foreground leading-tight', className)}
      {...props}
    />
  )
)
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('pl-2 text-muted-foreground text-sm', className)} {...props} />
))
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('px-6 py-4', className)} {...props} />
  )
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-between gap-2 px-6 py-4',

        className
      )}
      {...props}
    />
  )
)
CardFooter.displayName = 'CardFooter'

const Separator = () => {
  return (
    <div className='border border-t-border/10 border-r-transparent border-b-border/10 border-l-transparent' />
  )
}

export {
  Card,
  CardHeader,
  CardStyled,
  CardFooter,
  CardTitle,
  Separator,
  CardDescription,
  CardContent,
}
