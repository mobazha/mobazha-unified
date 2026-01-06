'use client';

import React, { forwardRef, InputHTMLAttributes, useState, useId } from 'react';
import { cn } from '../../lib/utils';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: InputSize;
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const sizeStyles: Record<InputSize, string> = {
  sm: 'h-8 text-sm px-3',
  md: 'h-10 text-base px-4',
  lg: 'h-12 text-lg px-4',
};

const iconSizeStyles: Record<InputSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

/**
 * Input 组件
 *
 * @example
 * ```tsx
 * <Input label="Email" placeholder="Enter email" />
 * <Input error="This field is required" />
 * <Input leftIcon={<SearchIcon />} />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = 'md',
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const [focused, setFocused] = useState(false);
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            {label}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none',
                iconSizeStyles[size]
              )}
            >
              {leftIcon}
            </div>
          )}

          {/* Input Element */}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              // 基础样式
              'w-full rounded-lg border bg-white dark:bg-slate-800',
              'text-slate-900 dark:text-white placeholder:text-slate-400',
              'transition-all duration-200',
              // 边框状态
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : focused
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500',
              // Focus 样式
              'focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500',
              // Disabled 样式
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-900',
              // 尺寸
              sizeStyles[size],
              // 图标 padding
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              // 自定义
              className
            )}
            disabled={disabled}
            onFocus={e => {
              setFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={e => {
              setFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />

          {/* Right Icon */}
          {rightIcon && (
            <div
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2 text-slate-400',
                iconSizeStyles[size]
              )}
            >
              {rightIcon}
            </div>
          )}
        </div>

        {/* Error or Hint */}
        {(error || hint) && (
          <p
            className={cn('text-sm', error ? 'text-red-500' : 'text-slate-500 dark:text-slate-400')}
          >
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
