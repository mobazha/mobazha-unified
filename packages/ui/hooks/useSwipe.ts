/**
 * useSwipe — 基于 @use-gesture/react 的高级滑动 hook
 *
 * 用法：
 *   const bind = useSwipe({ onSwipeLeft: () => goNext() });
 *   <div {...bind()} />
 */

import { useCallback, useRef } from 'react';
import { useDrag } from '@use-gesture/react';

export interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

export interface UseSwipeOptions extends SwipeHandlers {
  /** Minimum distance (px) to trigger a swipe. Default: 50 */
  threshold?: number;
  /** Minimum velocity (px/ms) to trigger a swipe. Default: 0.3 */
  velocity?: number;
}

export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  velocity: velocityThreshold = 0.3,
}: UseSwipeOptions) {
  const handled = useRef(false);

  const handleSwipe = useCallback(
    (dx: number, dy: number) => {
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx > absDy) {
        if (dx < 0 && onSwipeLeft) onSwipeLeft();
        if (dx > 0 && onSwipeRight) onSwipeRight();
      } else {
        if (dy < 0 && onSwipeUp) onSwipeUp();
        if (dy > 0 && onSwipeDown) onSwipeDown();
      }
    },
    [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]
  );

  const bind = useDrag(
    ({ movement: [mx, my], velocity: [vx, vy], last }) => {
      if (!last) {
        handled.current = false;
        return;
      }
      if (handled.current) return;

      const absMx = Math.abs(mx);
      const absMy = Math.abs(my);
      const speed = Math.max(vx, vy);

      if ((absMx > threshold || absMy > threshold) && speed > velocityThreshold) {
        handled.current = true;
        handleSwipe(mx, my);
      }
    },
    { filterTaps: true, axis: undefined }
  );

  return bind;
}
