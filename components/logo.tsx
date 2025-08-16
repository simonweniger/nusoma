import Image from 'next/image';
import { cn } from '@/lib/utils';

export type LogoProps = {
  className?: string;
  title?: string;
  width?: number;
  height?: number;
};

export const Logo = ({
  className,
  title = 'nusoma',
  width = 120,
  height = 120,
}: LogoProps) => (
  <Image
    alt={title}
    className={cn('h-auto w-auto', className)}
    height={height}
    priority
    src="/logo.svg"
    width={width}
  />
);
