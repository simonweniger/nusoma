'use client'

import * as React from 'react'
import { cn } from '@nusoma/design-system/lib/utils'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { XIcon } from 'lucide-react'

export type DialogProps = React.ComponentProps<typeof DialogPrimitive.Root>
const Dialog = DialogPrimitive.Root

export type DialogTriggerElement = React.ElementRef<typeof DialogPrimitive.Trigger>
export type DialogTriggerProps = React.ComponentProps<typeof DialogPrimitive.Trigger>
const DialogTrigger = DialogPrimitive.Trigger

export type DialogPortalProps = React.ComponentProps<typeof DialogPrimitive.Portal>
const DialogPortal = DialogPrimitive.Portal

export type DialogCloseElement = React.ElementRef<typeof DialogPrimitive.Close>
export type DialogCloseProps = React.ComponentProps<typeof DialogPrimitive.Close>
const DialogClose = DialogPrimitive.Close

export type DialogOverlayElement = React.ElementRef<typeof DialogPrimitive.Overlay>
export type DialogOverlayProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
const DialogOverlay = React.forwardRef<DialogOverlayElement, DialogOverlayProps>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80 data-[state=closed]:animate-out data-[state=open]:animate-in',
        className
      )}
      {...props}
    />
  )
)
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

export type DialogContentElement = React.ElementRef<typeof DialogPrimitive.Content>
export type DialogContentProps = Omit<
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
  'onEscapeKeyDown' | 'onPointerDownOutside'
> & {
  onClose?: () => void
}
const DialogContent = React.forwardRef<DialogContentElement, DialogContentProps>(
  ({ onClose, className, children, ...props }, ref) => {
    const handleClose = (): void => {
      onClose?.()
    }
    return (
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            '-translate-x-1/2 -translate-y-1/2 data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-50 grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in sm:rounded-lg md:w-full',
            className
          )}
          onEscapeKeyDown={handleClose}
          onPointerDownOutside={handleClose}
          {...props}
        >
          {children}
          <DialogPrimitive.Close
            type='button'
            className='absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground'
            onClick={handleClose}
          >
            <XIcon className='size-4 shrink-0' />
            <span className='sr-only'>Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    )
  }
)
DialogContent.displayName = DialogPrimitive.Content.displayName

export type DialogHeaderElement = HTMLDivElement
export type DialogHeaderProps = React.HTMLAttributes<HTMLDivElement>
const DialogHeader = ({ className, ...props }: DialogHeaderProps) => (
  <div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

export type DialogFooterElement = HTMLDivElement
export type DialogFooterProps = React.HTMLAttributes<HTMLDivElement>
const DialogFooter = ({ className, ...props }: DialogFooterProps) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
    {...props}
  />
)
DialogFooter.displayName = 'DialogFooter'

export type DialogTitleElement = React.ElementRef<typeof DialogPrimitive.Title>
export type DialogTitleProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
const DialogTitle = React.forwardRef<DialogTitleElement, DialogTitleProps>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Title
      ref={ref}
      className={cn('font-semibold text-lg leading-none tracking-tight', className)}
      {...props}
    />
  )
)
DialogTitle.displayName = DialogPrimitive.Title.displayName

export type DialogDescriptionElement = React.ElementRef<typeof DialogPrimitive.Description>
export type DialogDescriptionProps = React.ComponentPropsWithoutRef<
  typeof DialogPrimitive.Description
>
const DialogDescription = React.forwardRef<DialogDescriptionElement, DialogDescriptionProps>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Description
      ref={ref}
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
)
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
