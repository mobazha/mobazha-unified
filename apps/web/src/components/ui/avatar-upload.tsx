'use client';

import React, { useRef, useCallback } from 'react';
import { Camera } from 'lucide-react';
import { AvatarCompat } from './avatar-compat';
import { cn } from '@/lib/utils';

export interface AvatarUploadProps {
  /** URL of current avatar (from server or blob preview) */
  src?: string;
  /** Fallback name for initials */
  name?: string;
  /** Called when user selects a file */
  onFileSelect: (file: File) => void;
  /** Visual size */
  size?: 'md' | 'lg' | 'xl';
  disabled?: boolean;
  /** Accessible label */
  label?: string;
  className?: string;
}

const sizeMap = {
  md: 'w-14 h-14',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20',
} as const;

const avatarSizeMap: Record<string, 'md' | 'lg' | 'xl'> = {
  md: 'lg',
  lg: 'xl',
  xl: 'xl',
};

const placeholderIconSize = {
  md: 'w-5 h-5',
  lg: 'w-5 h-5',
  xl: 'w-6 h-6',
} as const;

export function AvatarUpload({
  src,
  name,
  onFileSelect,
  size = 'xl',
  disabled = false,
  label = 'Change avatar',
  className,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
        e.preventDefault();
        inputRef.current?.click();
      }
    },
    [disabled]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
      e.target.value = '';
    },
    [onFileSelect]
  );

  const sizeClass = sizeMap[size];

  return (
    <div
      className={cn(
        'relative group cursor-pointer',
        disabled && 'cursor-not-allowed opacity-60',
        className
      )}
      onClick={handleClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      onKeyDown={handleKeyDown}
    >
      {src ? (
        <img
          src={src}
          alt={name || 'Avatar'}
          className={cn(sizeClass, 'rounded-full object-cover border-2 border-border')}
        />
      ) : name ? (
        <AvatarCompat src={undefined} name={name} size={avatarSizeMap[size]} />
      ) : (
        <div
          className={cn(
            sizeClass,
            'rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border'
          )}
        >
          <Camera className={cn(placeholderIconSize[size], 'text-muted-foreground')} />
        </div>
      )}
      {!disabled && (
        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Camera className="w-5 h-5 text-white" />
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
