'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  /** 方向 */
  direction?: 'horizontal' | 'vertical';
  /** 对齐方式 */
  align?: 'start' | 'center' | 'end' | 'stretch';
  /** 主轴对齐 */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  /** 间距 */
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** 是否换行 */
  wrap?: boolean;
}

const directionStyles = {
  horizontal: 'flex-row',
  vertical: 'flex-col',
};

const alignStyles = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
};

const justifyStyles = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
};

const gapStyles = {
  none: 'gap-0',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

/**
 * Stack 堆叠布局组件
 */
export const Stack = forwardRef<HTMLDivElement, StackProps>(
  (
    {
      children,
      direction = 'vertical',
      align = 'stretch',
      justify = 'start',
      gap = 'md',
      wrap = false,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex',
          directionStyles[direction],
          alignStyles[align],
          justifyStyles[justify],
          gapStyles[gap],
          wrap && 'flex-wrap',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Stack.displayName = 'Stack';

/**
 * HStack 水平堆叠
 */
export const HStack = forwardRef<HTMLDivElement, Omit<StackProps, 'direction'>>((props, ref) => (
  <Stack ref={ref} direction="horizontal" {...props} />
));

HStack.displayName = 'HStack';

/**
 * VStack 垂直堆叠
 */
export const VStack = forwardRef<HTMLDivElement, Omit<StackProps, 'direction'>>((props, ref) => (
  <Stack ref={ref} direction="vertical" {...props} />
));

VStack.displayName = 'VStack';
