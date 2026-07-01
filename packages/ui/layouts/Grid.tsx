'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../lib/utils';

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  /** 列数 (1-12) */
  cols?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  /** 移动端列数 */
  colsMobile?: 1 | 2;
  /** 平板列数 */
  colsTablet?: 1 | 2 | 3 | 4;
  /** 间距 */
  gap?: 'none' | 'sm' | 'md' | 'lg';
}

const gapStyles = {
  none: 'gap-0',
  sm: 'gap-3',
  md: 'gap-4 sm:gap-6',
  lg: 'gap-6 sm:gap-8',
};

const colsMobileStyles = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
};

const colsTabletStyles = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
};

const colsDesktopStyles = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
  6: 'lg:grid-cols-6',
  12: 'lg:grid-cols-12',
};

/**
 * Grid 网格布局组件
 *
 * @example
 * ```tsx
 * <Grid cols={4} colsMobile={1} colsTablet={2} gap="md">
 *   {items.map(item => <Card key={item.id}>{item.title}</Card>)}
 * </Grid>
 * ```
 */
export const Grid = forwardRef<HTMLDivElement, GridProps>(
  (
    { children, cols = 4, colsMobile = 1, colsTablet = 2, gap = 'md', className, ...props },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'grid',
          colsMobileStyles[colsMobile],
          colsTabletStyles[colsTablet],
          colsDesktopStyles[cols],
          gapStyles[gap],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Grid.displayName = 'Grid';
