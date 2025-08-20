import {
  CheckCircleIcon,
  CircleXIcon,
  HourglassIcon,
  LoaderIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type StatusIndicatorProps = {
  status: 'pending' | 'running' | 'completed' | 'failed';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
};

export const StatusIndicator = ({
  status,
  size = 'md',
  showText = false,
  className,
}: StatusIndicatorProps) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const iconClass = cn(sizeClasses[size], className);

  const statusConfig = {
    pending: {
      icon: (
        <HourglassIcon
          className={cn(iconClass, 'animate-pulse text-orange-500')}
        />
      ),
      text: 'Pending',
      color: 'text-orange-500',
    },
    running: {
      icon: (
        <LoaderIcon className={cn(iconClass, 'animate-spin text-blue-500')} />
      ),
      text: 'Generating',
      color: 'text-blue-500',
    },
    completed: {
      icon: <CheckCircleIcon className={cn(iconClass, 'text-green-500')} />,
      text: 'Completed',
      color: 'text-green-500',
    },
    failed: {
      icon: <CircleXIcon className={cn(iconClass, 'text-red-500')} />,
      text: 'Failed',
      color: 'text-red-500',
    },
  };

  const config = statusConfig[status];

  if (showText) {
    return (
      <div className="flex items-center gap-1">
        {config.icon}
        <span className={cn('font-medium text-xs', config.color)}>
          {config.text}
        </span>
      </div>
    );
  }

  return config.icon;
};
