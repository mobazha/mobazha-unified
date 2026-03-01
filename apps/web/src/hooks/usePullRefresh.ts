'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface PullRefreshState {
  /** Whether a refresh is in progress */
  isRefreshing: boolean;
  /** Current pull distance (px) during an active gesture */
  pullDistance: number;
  /** True once pull exceeds the threshold (visual hint to "release") */
  canRelease: boolean;
}

export interface UsePullRefreshOptions {
  /** Async function to call on refresh */
  onRefresh: () => Promise<void>;
  /** Pull distance (px) required to trigger refresh */
  threshold?: number;
  /** Maximum pull distance (px) — limits rubber-band effect */
  maxPull?: number;
  /** Disable the hook (e.g. on desktop) */
  disabled?: boolean;
}

const DEFAULT_THRESHOLD = 64;
const DEFAULT_MAX_PULL = 120;

/**
 * Touch-based pull-to-refresh for scrollable containers.
 *
 * Usage:
 * ```tsx
 * const { containerRef, pullDistance, isRefreshing, canRelease } = usePullRefresh({
 *   onRefresh: async () => { await refetch(); },
 * });
 * return <div ref={containerRef}>...</div>;
 * ```
 */
export function usePullRefresh({
  onRefresh,
  threshold = DEFAULT_THRESHOLD,
  maxPull = DEFAULT_MAX_PULL,
  disabled = false,
}: UsePullRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pulling = useRef(false);

  const canRelease = pullDistance >= threshold;

  const handleTouchStart = useCallback(
    (e: { touches: { clientY: number }[] }) => {
      if (disabled || isRefreshing) return;
      const el = containerRef.current;
      if (!el || el.scrollTop > 0) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    },
    [disabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: { touches: { clientY: number }[] }) => {
      if (!pulling.current || disabled || isRefreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        setPullDistance(0);
        return;
      }
      const distance = Math.min(dy * 0.5, maxPull);
      setPullDistance(distance);
    },
    [disabled, isRefreshing, maxPull]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || disabled) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onStart = handleTouchStart as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onMove = handleTouchMove as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onEnd = handleTouchEnd as any;

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
    el.addEventListener('touchend', onEnd);

    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, disabled]);

  return {
    containerRef,
    pullDistance,
    isRefreshing,
    canRelease,
  };
}
