import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

interface UseProgressiveListOptions {
  /** Items to render per batch (default: 24) */
  batchSize?: number;
  /** Initial items to show (default: batchSize) */
  initialCount?: number;
  /** Threshold for IntersectionObserver (default: 0.1) */
  threshold?: number;
}

interface UseProgressiveListReturn<T> {
  /** Visible items slice */
  visibleItems: T[];
  /** Whether there are more items to show */
  hasMore: boolean;
  /** Load the next batch */
  loadMore: () => void;
  /** Show all items at once */
  showAll: () => void;
  /** Ref to attach to the sentinel element for auto-loading */
  sentinelRef: (node: HTMLElement | null) => void;
  /** Total items count */
  totalCount: number;
  /** Visible items count */
  visibleCount: number;
}

/**
 * Progressive list rendering — shows items in batches to avoid
 * rendering hundreds of DOM nodes at once.
 *
 * Attach `sentinelRef` to an element at the bottom of the list
 * for automatic infinite-scroll behavior.
 */
export function useProgressiveList<T>(
  items: T[],
  options: UseProgressiveListOptions = {}
): UseProgressiveListReturn<T> {
  const { batchSize = 24, initialCount, threshold = 0.1 } = options;
  const initial = initialCount ?? batchSize;

  const [visibleCount, setVisibleCount] = useState(initial);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadMore = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + batchSize, items.length));
  }, [batchSize, items.length]);

  const showAll = useCallback(() => {
    setVisibleCount(items.length);
  }, [items.length]);

  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (!node) return;

      observerRef.current = new IntersectionObserver(
        entries => {
          if (entries[0]?.isIntersecting) {
            loadMore();
          }
        },
        { threshold }
      );
      observerRef.current.observe(node);
    },
    [loadMore, threshold]
  );

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);

  return {
    visibleItems,
    hasMore: visibleCount < items.length,
    loadMore,
    showAll,
    sentinelRef,
    totalCount: items.length,
    visibleCount: Math.min(visibleCount, items.length),
  };
}
