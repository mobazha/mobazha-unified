'use client';

import React, { useRef, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface VirtualListProps<T> {
  /** 数据列表 */
  items: T[];
  /** 单项高度 (像素) */
  itemHeight: number;
  /** 容器高度 */
  height: number | string;
  /** 渲染单个项目 */
  renderItem: (item: T, index: number) => ReactNode;
  /** 容器类名 */
  className?: string;
  /** 过扫描数量 (额外渲染的项目数) */
  overscan?: number;
  /** 唯一键提取函数 */
  getKey?: (item: T, index: number) => string | number;
  /** 空状态渲染 */
  emptyState?: ReactNode;
  /** 加载更多回调 */
  onLoadMore?: () => void;
  /** 加载更多阈值 (距离底部的像素) */
  loadMoreThreshold?: number;
  /** 是否正在加载 */
  isLoading?: boolean;
  /** 加载指示器 */
  loadingIndicator?: ReactNode;
}

/**
 * 虚拟列表组件
 *
 * 只渲染可见区域的项目，提升大列表性能
 *
 * @example
 * ```tsx
 * <VirtualList
 *   items={products}
 *   itemHeight={200}
 *   height={600}
 *   renderItem={(product) => <ProductCard {...product} />}
 * />
 * ```
 */
export function VirtualList<T>({
  items,
  itemHeight,
  height,
  renderItem,
  className,
  overscan = 3,
  getKey,
  emptyState,
  onLoadMore,
  loadMoreThreshold = 200,
  isLoading,
  loadingIndicator,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const containerHeight = typeof height === 'number' ? height : 0;
  const totalHeight = items.length * itemHeight;

  // 计算可见区域
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // 可见项目
  const visibleItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange;
    return items.slice(startIndex, endIndex + 1).map((item, idx) => ({
      item,
      index: startIndex + idx,
    }));
  }, [items, visibleRange]);

  // 处理滚动
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    setScrollTop(container.scrollTop);

    // 检查是否需要加载更多
    if (onLoadMore && !isLoading) {
      const { scrollHeight, scrollTop: st, clientHeight } = container;
      if (scrollHeight - st - clientHeight < loadMoreThreshold) {
        onLoadMore();
      }
    }
  }, [onLoadMore, isLoading, loadMoreThreshold]);

  // 监听滚动
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // 空状态
  if (items.length === 0 && !isLoading) {
    return (
      <div className={cn('flex items-center justify-center', className)} style={{ height }}>
        {emptyState || <p className="text-slate-400 dark:text-slate-500">No items to display</p>}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn('overflow-auto', className)} style={{ height }}>
      {/* 撑开高度的容器 */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* 渲染可见项目 */}
        {visibleItems.map(({ item, index }) => (
          <div
            key={getKey ? getKey(item, index) : index}
            style={{
              position: 'absolute',
              top: index * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>

      {/* 加载指示器 */}
      {isLoading && (
        <div className="flex justify-center py-4">
          {loadingIndicator || (
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      )}
    </div>
  );
}

VirtualList.displayName = 'VirtualList';

export default VirtualList;
