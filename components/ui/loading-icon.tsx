import { LoaderCircleIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type LoadingIconProps = Parameters<typeof LoaderCircleIcon>[0];

export function LoadingIcon({ className, ...props }: LoadingIconProps) {
  return (
    <LoaderCircleIcon
      className={cn('animate-spin opacity-50', className)}
      {...props}
    />
  );
}
