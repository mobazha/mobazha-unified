'use client';

import React, { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hoverable?: boolean;
}

const variantStyles = {
  default: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
  outlined: 'bg-transparent border-2 border-slate-200 dark:border-slate-700',
  elevated: 'bg-white dark:bg-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50',
};

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
};

/**
 * Card 组件
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { children, variant = 'default', padding = 'md', hoverable = false, className, ...props },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl transition-all duration-200',
          variantStyles[variant],
          paddingStyles[padding],
          hoverable && 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

/**
 * CardHeader 组件
 */
export interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Card 标题 */
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ title, subtitle, action, children, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('flex items-start justify-between mb-4', className)} {...props}>
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
          )}
          {children}
        </div>
        {action && <div className="flex-shrink-0 ml-4">{action}</div>}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

/**
 * CardBody 组件
 */
export const CardBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('text-slate-700 dark:text-slate-300', className)} {...props}>
        {children}
      </div>
    );
  }
);

CardBody.displayName = 'CardBody';

/**
 * CardFooter 组件
 */
export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';
