'use client';

import React, { useState, useCallback, useEffect, ImgHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface OptimizedImageProps extends Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  'onError' | 'onLoad'
> {
  /** 回退图片 URL */
  fallbackSrc?: string;
  /** 显示加载骨架 */
  showSkeleton?: boolean;
  /** 图片容器类名 */
  containerClassName?: string;
  /** 加载完成回调 */
  onLoadComplete?: () => void;
  /** 加载错误回调 */
  onLoadError?: () => void;
  /** 图片纵横比 (用于占位) */
  aspectRatio?: 'square' | '4/3' | '16/9' | '3/2' | 'auto';
  /** 对象适应方式 */
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
}

// 默认占位图 (base64 SVG)
const DEFAULT_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTJlOGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTRhM2I4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2U8L3RleHQ+PC9zdmc+';

// 纵横比映射
const ASPECT_RATIO_MAP = {
  square: 'aspect-square',
  '4/3': 'aspect-[4/3]',
  '16/9': 'aspect-video',
  '3/2': 'aspect-[3/2]',
  auto: '',
};

// 对象适应映射
const OBJECT_FIT_MAP = {
  cover: 'object-cover',
  contain: 'object-contain',
  fill: 'object-fill',
  none: 'object-none',
  'scale-down': 'object-scale-down',
};

/**
 * 优化的图片组件
 *
 * 特性:
 * - 自动懒加载
 * - 加载骨架动画
 * - 错误回退图片
 * - 响应式尺寸
 *
 * @example
 * ```tsx
 * <OptimizedImage
 *   src="/product.jpg"
 *   alt="Product"
 *   showSkeleton
 *   aspectRatio="square"
 * />
 * ```
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  fallbackSrc = DEFAULT_PLACEHOLDER,
  showSkeleton = true,
  containerClassName,
  onLoadComplete,
  onLoadError,
  aspectRatio = 'auto',
  objectFit = 'cover',
  className,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoadComplete?.();
  }, [onLoadComplete]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    if (currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
    }
    onLoadError?.();
  }, [currentSrc, fallbackSrc, onLoadError]);

  // 重置状态当 src 变化
  useEffect(() => {
    // 使用 setTimeout 避免同步 setState 引起级联渲染
    const timer = setTimeout(() => {
      setCurrentSrc(src);
      setHasError(false);
      setIsLoading(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [src]);

  const aspectRatioClass = ASPECT_RATIO_MAP[aspectRatio];
  const objectFitClass = OBJECT_FIT_MAP[objectFit];

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-background-alt',
        aspectRatioClass,
        containerClassName
      )}
    >
      {/* 加载骨架 */}
      {showSkeleton && isLoading && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-background-alt via-surface to-background-alt" />
      )}

      {/* 图片 */}
      <img
        src={hasError ? fallbackSrc : currentSrc}
        alt={alt}
        className={cn(
          'w-full h-full transition-opacity duration-300',
          objectFitClass,
          isLoading ? 'opacity-0' : 'opacity-100',
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
        decoding="async"
        {...props}
      />
    </div>
  );
};

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;
