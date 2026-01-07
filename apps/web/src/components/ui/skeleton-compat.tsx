import * as React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonCompatProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rectangular' | 'circular' | 'rounded';
  height?: number | string;
  width?: number | string;
}

/**
 * Skeleton 兼容组件 - 兼容旧的 Skeleton API
 */
function SkeletonCompat({
  className,
  variant = 'text',
  height,
  width,
  style,
  ...props
}: SkeletonCompatProps) {
  const variantClasses = {
    text: 'rounded',
    rectangular: 'rounded-md',
    circular: 'rounded-full',
    rounded: 'rounded-lg',
  };

  return (
    <div
      className={cn('animate-pulse bg-muted', variantClasses[variant], className)}
      style={{
        height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
        width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
        ...style,
      }}
      {...props}
    />
  );
}

export { SkeletonCompat as Skeleton };
