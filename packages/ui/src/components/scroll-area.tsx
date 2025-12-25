'use client';

import * as React from 'react';
import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area';

import {
  useMediaQuery,
  type UseMediaQueryOptions
} from '../hooks/use-media-query';
import { cn } from '../lib/utils';

export type ScrollAreaProps = ScrollAreaPrimitive.Root.Props & {
  verticalScrollBar?: boolean;
  horizontalScrollBar?: boolean;
};

function ScrollArea({
  verticalScrollBar = true,
  horizontalScrollBar = false,
  className,
  children,
  ...props
}: ScrollAreaProps) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn('relative', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      {verticalScrollBar && <ScrollBar orientation="vertical" />}
      {horizontalScrollBar && <ScrollBar orientation="horizontal" />}
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

export type ScrollBarProps = ScrollAreaPrimitive.Scrollbar.Props;

function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: ScrollBarProps) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        'data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent flex touch-none p-px transition-colors select-none',
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="rounded-full bg-border relative flex-1"
      />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

export type ResponsiveScrollAreaProps = ScrollAreaProps & {
  breakpoint: string;
  mediaQueryOptions?: UseMediaQueryOptions;
  fallbackProps?: React.HTMLAttributes<HTMLDivElement>;
};

function ResponsiveScrollArea({
  breakpoint,
  mediaQueryOptions,
  fallbackProps,
  verticalScrollBar,
  horizontalScrollBar,
  className,
  children,
  ...scrollAreaProps
}: ResponsiveScrollAreaProps) {
  const isMatched = useMediaQuery(breakpoint, mediaQueryOptions);

  if (isMatched) {
    return (
      <ScrollArea
        verticalScrollBar={verticalScrollBar}
        horizontalScrollBar={horizontalScrollBar}
        className={className}
        {...scrollAreaProps}
      >
        {children}
      </ScrollArea>
    );
  }

  return (
    <div
      className={typeof className === 'string' ? className : undefined}
      {...fallbackProps}
    >
      {children}
    </div>
  );
}

export { ResponsiveScrollArea, ScrollArea, ScrollBar };
