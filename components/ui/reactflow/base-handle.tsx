import { Handle, type HandleProps } from '@xyflow/react';
import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

export type BaseHandleProps = HandleProps;

export const BaseHandle = forwardRef<HTMLDivElement, BaseHandleProps>(
  ({ className, children, style, ...props }, ref) => {
    return (
      <Handle
        className={cn(
          '!h-3 !w-3 !z-50 !rounded-full !border-2 !border-white !shadow-md !transition-colors hover:!bg-blue-600 dark:!border-gray-800 dark:!bg-blue-400 dark:hover:!bg-blue-300',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </Handle>
    );
  }
);

BaseHandle.displayName = 'BaseHandle';
