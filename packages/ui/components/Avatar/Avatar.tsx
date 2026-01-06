'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '../../lib/utils';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  className?: string;
  onClick?: () => void;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  verified?: boolean;
}

const sizeStyles: Record<AvatarSize, string> = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-xl',
};

const statusSizeStyles: Record<AvatarSize, string> = {
  xs: 'h-1.5 w-1.5 border',
  sm: 'h-2 w-2 border',
  md: 'h-2.5 w-2.5 border-2',
  lg: 'h-3 w-3 border-2',
  xl: 'h-4 w-4 border-2',
};

const verifiedSizeStyles: Record<AvatarSize, string> = {
  xs: 'h-3 w-3',
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
  xl: 'h-6 w-6',
};

// 根据名字生成颜色 - 使用主题感知的颜色
const getColorFromName = (name: string): string => {
  const colors = ['bg-primary', 'bg-secondary', 'bg-accent', 'bg-info', 'bg-success', 'bg-warning'];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
};

// 获取名字首字母
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Avatar 组件
 *
 * @example
 * ```tsx
 * <Avatar src="/user.jpg" name="John Doe" size="md" />
 * <Avatar name="John Doe" showOnlineStatus isOnline />
 * <Avatar name="Store" verified />
 * ```
 */
export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  name = '',
  size = 'md',
  className,
  onClick,
  showOnlineStatus = false,
  isOnline = false,
  verified = false,
}) => {
  const [imageError, setImageError] = useState(false);

  const initials = useMemo(() => getInitials(name || 'U'), [name]);
  const bgColor = useMemo(() => getColorFromName(name || 'default'), [name]);

  const showFallback = !src || imageError;

  return (
    <div
      className={cn('relative inline-flex flex-shrink-0', onClick && 'cursor-pointer', className)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Avatar Image or Fallback */}
      <div
        className={cn(
          'rounded-full overflow-hidden flex items-center justify-center font-semibold text-text-inverse',
          sizeStyles[size],
          showFallback && bgColor
        )}
      >
        {!showFallback ? (
          <img
            src={src}
            alt={alt || name || 'Avatar'}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {/* Online Status Indicator */}
      {showOnlineStatus && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-surface',
            isOnline ? 'bg-success' : 'bg-text-muted',
            statusSizeStyles[size]
          )}
        />
      )}

      {/* Verified Badge */}
      {verified && (
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 bg-surface rounded-full flex items-center justify-center',
            verifiedSizeStyles[size]
          )}
        >
          <svg className="h-full w-full text-primary" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      )}
    </div>
  );
};

Avatar.displayName = 'Avatar';
