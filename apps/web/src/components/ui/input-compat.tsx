'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputCompatProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'size'
> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  label?: string;
  error?: string;
  hint?: string;
  inputSize?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-8 text-sm',
  md: 'h-10 text-sm',
  lg: 'h-12 text-base',
};

/**
 * Input 兼容组件 - 兼容旧的 Input API
 */
const InputCompat = React.forwardRef<HTMLInputElement, InputCompatProps>(
  (
    {
      className,
      type,
      leftIcon,
      rightIcon,
      fullWidth,
      label,
      error,
      hint,
      inputSize = 'md',
      ...props
    },
    ref
  ) => {
    const inputId = React.useId();

    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-muted-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            type={type}
            className={cn(
              'flex w-full rounded-md border border-border bg-background px-3 py-2 ring-offset-background',
              'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              sizeClasses[inputSize],
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-destructive focus-visible:ring-destructive',
              className
            )}
            ref={ref}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {rightIcon}
            </div>
          )}
        </div>
        {(error || hint) && (
          <p className={cn('text-sm', error ? 'text-destructive' : 'text-muted-foreground')}>
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

InputCompat.displayName = 'Input';

export { InputCompat as Input };
