'use client';

import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { cn } from '@/lib/utils';

interface AvatarCompatProps {
  src?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  verified?: boolean;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
  xl: 'h-16 w-16 text-xl',
};

/**
 * Avatar 兼容组件 - 兼容旧的 Avatar API
 */
export const AvatarCompat: React.FC<AvatarCompatProps> = ({
  src,
  name,
  size = 'md',
  className,
  showOnlineStatus,
  isOnline,
  verified,
}) => {
  const initial = name ? name.charAt(0).toUpperCase() : '?';

  return (
    <div className="relative inline-block">
      <Avatar className={cn(sizeClasses[size], className)}>
        {src && <AvatarImage src={src} alt={name || 'Avatar'} />}
        <AvatarFallback>{initial}</AvatarFallback>
      </Avatar>
      {showOnlineStatus && (
        <span
          className={cn(
            'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background',
            isOnline ? 'bg-green-500' : 'bg-gray-400'
          )}
        />
      )}
      {verified && (
        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center border-2 border-background">
          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      )}
    </div>
  );
};

AvatarCompat.displayName = 'AvatarCompat';
