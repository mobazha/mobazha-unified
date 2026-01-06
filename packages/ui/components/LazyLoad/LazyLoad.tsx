'use client';

import React, { useRef, useEffect, useState, ReactNode, useMemo, useCallback } from 'react';
import { cn } from '../../lib/utils';

export interface LazyLoadProps {
  /** 子元素 */
  children: ReactNode;
  /** 占位符 */
  placeholder?: ReactNode;
  /** 根元素边距 (IntersectionObserver rootMargin) */
  rootMargin?: string;
  /** 可见阈值 (0-1) */
  threshold?: number;
  /** 容器类名 */
  className?: string;
  /** 只触发一次 */
  once?: boolean;
  /** 加载完成回调 */
  onVisible?: () => void;
  /** 最小高度 (防止布局跳动) */
  minHeight?: number | string;
}

// 检查是否支持 IntersectionObserver
const supportsIntersectionObserver =
  typeof window !== 'undefined' && 'IntersectionObserver' in window;

/**
 * 懒加载组件
 *
 * 使用 Intersection Observer 实现视口内懒加载
 *
 * @example
 * ```tsx
 * <LazyLoad placeholder={<Skeleton />}>
 *   <ExpensiveComponent />
 * </LazyLoad>
 * ```
 */
export const LazyLoad: React.FC<LazyLoadProps> = ({
  children,
  placeholder,
  rootMargin = '100px',
  threshold = 0,
  className,
  once = true,
  onVisible,
  minHeight,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  // 如果不支持 IntersectionObserver，默认可见
  const [isVisible, setIsVisible] = useState(!supportsIntersectionObserver);

  // 稳定的 onVisible 回调
  const handleVisible = useCallback(() => {
    onVisible?.();
  }, [onVisible]);

  useEffect(() => {
    const element = ref.current;
    if (!element || !supportsIntersectionObserver) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            handleVisible();
            if (once) {
              observer.unobserve(element);
            }
          } else if (!once) {
            setIsVisible(false);
          }
        });
      },
      {
        rootMargin,
        threshold,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, threshold, once, handleVisible]);

  const style = useMemo(() => ({ minHeight }), [minHeight]);

  return (
    <div ref={ref} className={cn('transition-opacity duration-300', className)} style={style}>
      {isVisible ? children : placeholder}
    </div>
  );
};

LazyLoad.displayName = 'LazyLoad';

export default LazyLoad;
