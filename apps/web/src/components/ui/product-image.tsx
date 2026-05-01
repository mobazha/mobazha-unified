'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

interface ProductImageProps {
  src?: string | null;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  className?: string;
  containerClassName?: string;
  iconSize?: 'sm' | 'md' | 'lg';
  priority?: boolean;
}

const iconSizeMap = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export function ProductImage({
  src,
  alt,
  fill = false,
  width,
  height,
  sizes,
  className,
  containerClassName,
  iconSize = 'md',
  priority = false,
}: ProductImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(src ? 'loading' : 'error');

  const handleLoad = useCallback(() => setStatus('loaded'), []);
  const handleError = useCallback(() => setStatus('error'), []);

  // Bypass Next.js image optimization for:
  // - Gateway-served images (/v1/ paths): standalone Node can't reach gateway
  // - External URLs: third-party CDNs (e.g. Printful) may not be in remotePatterns
  const isGatewayImage = !!src && src.startsWith('/v1/');
  const isExternalUrl =
    !!src &&
    (src.startsWith('http://') || src.startsWith('https://')) &&
    !src.includes('.mobazha.com') &&
    !src.includes('.mobazha.org');
  const shouldBypassOptimization = isGatewayImage || isExternalUrl;

  if (!src || status === 'error') {
    return (
      <div
        className={cn(
          'w-full h-full flex items-center justify-center bg-muted text-muted-foreground',
          containerClassName
        )}
      >
        <ImageOff className={iconSizeMap[iconSize]} />
      </div>
    );
  }

  return (
    <div className={cn('relative w-full h-full', containerClassName)}>
      {status === 'loading' && <Skeleton className="absolute inset-0 w-full h-full" />}
      {fill ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          unoptimized={shouldBypassOptimization}
          className={cn('object-cover', status === 'loading' && 'opacity-0', className)}
          onLoad={handleLoad}
          onError={handleError}
        />
      ) : (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={cn(
            'w-full h-full object-cover',
            status === 'loading' && 'opacity-0',
            className
          )}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
}

export function ProductImageNative({
  src,
  alt,
  className,
  containerClassName,
  iconSize = 'sm',
}: Omit<ProductImageProps, 'fill' | 'sizes' | 'priority' | 'width' | 'height'>) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div
        className={cn(
          'w-full h-full flex items-center justify-center bg-muted text-muted-foreground',
          containerClassName
        )}
      >
        <ImageOff className={iconSizeMap[iconSize]} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn('w-full h-full object-cover', className)}
      onError={() => setError(true)}
    />
  );
}
