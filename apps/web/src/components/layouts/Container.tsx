'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  /** 最大宽度 */
  size?: ContainerSize;
  /** 是否添加内边距 */
  padded?: boolean;
  /** 是否居中 */
  centered?: boolean;
}

const sizeStyles: Record<ContainerSize, string> = {
  sm: 'max-w-screen-sm', // 640px
  md: 'max-w-screen-md', // 768px
  lg: 'max-w-screen-lg', // 1024px
  xl: 'max-w-screen-xl', // 1280px
  full: 'max-w-full',
};

/**
 * Container 容器组件
 */
export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({ children, size = 'xl', padded = true, centered = true, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'w-full',
          sizeStyles[size],
          padded && 'px-4 sm:px-6 lg:px-8',
          centered && 'mx-auto',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Container.displayName = 'Container';
