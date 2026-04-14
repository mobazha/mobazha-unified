'use client';

import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { cn } from '@/lib/utils';
import { useAuthenticatedImage } from '@mobazha/core';

interface AvatarCompatProps {
  src?: string;
  rawMxcUrl?: string; // 原始 mxc:// URL，用于认证下载
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
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
 * 检查 URL 是否需要认证（Matrix 媒体 URL）
 */
function needsAuthentication(url: string | undefined): boolean {
  if (!url) return false;
  return (
    url.includes('/_matrix/client/v1/media/') ||
    url.includes('/chat/media/') ||
    url.startsWith('mxc://')
  );
}

/**
 * Avatar 兼容组件 - 支持 Matrix 认证图片
 */
export const AvatarCompat: React.FC<AvatarCompatProps> = ({
  src,
  rawMxcUrl,
  name,
  size = 'md',
  className,
  verified,
}) => {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  const [directImageError, setDirectImageError] = React.useState(false);

  // 如果有 rawMxcUrl 或 src 需要认证，使用认证下载
  const mxcUrlToLoad = rawMxcUrl || (needsAuthentication(src) ? src : undefined);
  const {
    imageUrl: authImageUrl,
    loading: authLoading,
    error: authError,
  } = useAuthenticatedImage(
    mxcUrlToLoad,
    undefined // 不使用 fallback，让 Avatar fallback 显示首字母
  );

  // 最终使用的图片 URL
  const finalImageUrl = React.useMemo(() => {
    // 如果有认证图片 URL（blob URL），优先使用
    if (authImageUrl) {
      return authImageUrl;
    }
    // 如果 src 不需要认证，直接使用
    if (src && !needsAuthentication(src) && !directImageError) {
      return src;
    }
    return null;
  }, [authImageUrl, src, directImageError]);

  // Reset error state when src changes
  React.useEffect(() => {
    setDirectImageError(false);
  }, [src]);

  const handleImageError = React.useCallback(() => {
    setDirectImageError(true);
  }, []);

  const showImage = finalImageUrl && !authError && !directImageError;

  return (
    <div className="relative inline-flex">
      <Avatar className={cn(sizeClasses[size], className)}>
        {authLoading && (
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
            <span className="animate-pulse w-full h-full rounded-full bg-muted" />
          </AvatarFallback>
        )}
        {showImage && !authLoading && (
          <AvatarImage src={finalImageUrl} alt={name || 'Avatar'} onError={handleImageError} />
        )}
        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
          {initial}
        </AvatarFallback>
      </Avatar>
      {verified && (
        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-info rounded-full flex items-center justify-center border-2 border-background">
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
