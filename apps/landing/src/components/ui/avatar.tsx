'use client'

import * as React from 'react'
import { cn } from '@nusoma/design-system/lib/utils'
import * as AvatarPrimitive from '@radix-ui/react-avatar'

export type AvatarElement = React.ComponentRef<typeof AvatarPrimitive.Root>
export type AvatarProps = React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
const Avatar = React.forwardRef<AvatarElement, AvatarProps>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn('relative flex size-10 shrink-0 overflow-hidden rounded-full', className)}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

export type AvatarImageElement = React.ComponentRef<typeof AvatarPrimitive.Image>
export type AvatarImageProps = React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
const AvatarImage = React.forwardRef<AvatarImageElement, AvatarImageProps>(
  ({ className, ...props }, ref) => (
    <AvatarPrimitive.Image
      ref={ref}
      className={cn('aspect-square size-full', className)}
      {...props}
    />
  )
)
AvatarImage.displayName = AvatarPrimitive.Image.displayName

export type AvatarFallbackElement = React.ComponentRef<typeof AvatarPrimitive.Fallback>
export type AvatarFallbackProps = React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
const AvatarFallback = React.forwardRef<AvatarFallbackElement, AvatarFallbackProps>(
  ({ className, ...props }, ref) => (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={cn('flex size-full items-center justify-center rounded-full bg-muted', className)}
      {...props}
    />
  )
)
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarFallback, AvatarImage }
