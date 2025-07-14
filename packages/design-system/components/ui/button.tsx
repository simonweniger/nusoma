import type * as React from 'react'
import { cn } from '@nusoma/design-system/lib/utils'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Spinner } from './spinner'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-all ease-in-out active:scale-[0.99] focus:shadow-none hover:shadow-none ",
  {
    variants: {
      variant: {
        default:
          'bg-primary tracking-wide text-primary-foreground shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] border border-white/[0.25] hover:bg-secondary/80 hover:bg-primary',
        destructive:
          'bg-destructive/50 text-destructive-foreground shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
        outline:
          'border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] border border-white/[0.12] hover:bg-secondary/80 hover:bg-secondary',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        xs: 'h-7 rounded-md px-2.5 text-xs',
        xxs: 'h-6 rounded-md px-2 text-xs',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export type ButtonElement = React.ComponentRef<'button'>
export type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    loading?: boolean
  }
function Button({
  className,
  variant,
  size,
  loading = false,
  asChild = false,
  children,
  ...props
}: ButtonProps): React.JSX.Element {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot='button'
      className={cn(buttonVariants({ variant, size, className }), loading && 'relative')}
      {...props}
    >
      {loading ? (
        <>
          <span className={cn({ 'opacity-0': loading })}>{children}</span>
          <span className='-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2'>
            <Spinner />
          </span>
        </>
      ) : (
        <>{children}</>
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
