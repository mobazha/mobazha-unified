'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

/**
 * Skeleton 加载占位组件
 *
 * @example
 * ```tsx
 * <Skeleton variant="text" width="200px" />
 * <Skeleton variant="circular" width={48} height={48} />
 * <Skeleton variant="rectangular" height={200} />
 * ```
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'text',
  width,
  height,
  animation = 'pulse',
}) => {
  const variantStyles = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg',
  };

  const animationStyles = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%]',
    none: '',
  };

  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      className={cn(
        'bg-slate-200 dark:bg-slate-700',
        variantStyles[variant],
        animationStyles[animation],
        className
      )}
      style={style}
    />
  );
};

Skeleton.displayName = 'Skeleton';

/**
 * SkeletonText - 多行文本骨架
 */
export interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({ lines = 3, className }) => {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  );
};

SkeletonText.displayName = 'SkeletonText';

/**
 * SkeletonCard - 卡片骨架
 */
export interface SkeletonCardProps {
  hasImage?: boolean;
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ hasImage = true, className }) => {
  return (
    <div className={cn('bg-white dark:bg-slate-800 rounded-xl p-4 space-y-4', className)}>
      {hasImage && <Skeleton variant="rounded" height={160} />}
      <Skeleton variant="text" width="70%" />
      <Skeleton variant="text" width="40%" />
      <div className="flex items-center gap-2">
        <Skeleton variant="circular" width={32} height={32} />
        <Skeleton variant="text" width={100} />
      </div>
    </div>
  );
};

SkeletonCard.displayName = 'SkeletonCard';
