'use client'

import * as React from 'react'
import { cn } from '@nusoma/design-system/lib/utils'
import * as TabsPrimitive from '@radix-ui/react-tabs'

export type UnderlinedTabsElement = React.ElementRef<typeof TabsPrimitive.Root>
export type UnderlinedTabsProps = React.ComponentProps<typeof TabsPrimitive.Root>
const UnderlinedTabs = TabsPrimitive.Root
UnderlinedTabs.displayName = 'UnderlinedTabs'

export type UnderlinedTabsListElement = React.ElementRef<typeof TabsPrimitive.List>
export type UnderlinedTabsListProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
const UnderlinedTabsList = React.forwardRef<UnderlinedTabsListElement, UnderlinedTabsListProps>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.List
      ref={ref}
      className={cn('inline-flex h-12 items-center justify-start text-muted-foreground', className)}
      {...props}
    />
  )
)
UnderlinedTabsList.displayName = 'UnderlinedTabsList'

export type UnderlinedTabsTriggerElement = React.ElementRef<typeof TabsPrimitive.Trigger>
export type UnderlinedTabsTriggerProps = React.ComponentPropsWithoutRef<
  typeof TabsPrimitive.Trigger
>
const UnderlinedTabsTrigger = React.forwardRef<
  UnderlinedTabsTriggerElement,
  UnderlinedTabsTriggerProps
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'group relative mx-4 inline-flex h-12 items-center justify-center whitespace-nowrap rounded-none border-b border-b-transparent bg-transparent py-1 pt-2 pb-3 text-muted-foreground text-sm shadow-none ring-offset-background transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-b-primary data-[state=active]:font-medium data-[state=active]:text-foreground data-[state=active]:shadow-none',
      className
    )}
    {...props}
  />
))
UnderlinedTabsTrigger.displayName = 'UnderlinedTabsTrigger'

export type UnderlinedTabsContentElement = React.ElementRef<typeof TabsPrimitive.Content>
export type UnderlinedTabsContentProps = React.ComponentPropsWithoutRef<
  typeof TabsPrimitive.Content
>
const UnderlinedTabsContent = React.forwardRef<
  UnderlinedTabsContentElement,
  UnderlinedTabsContentProps
>((props, ref) => <TabsPrimitive.Content ref={ref} {...props} />)
UnderlinedTabsContent.displayName = 'UnderlinedTabsContent'

export { UnderlinedTabs, UnderlinedTabsContent, UnderlinedTabsList, UnderlinedTabsTrigger }
