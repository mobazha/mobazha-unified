'use client';

import { Loader2 } from 'lucide-react';

interface PullRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  canRelease: boolean;
  threshold?: number;
}

export function PullRefreshIndicator({
  pullDistance,
  isRefreshing,
  canRelease,
  threshold = 64,
}: PullRefreshIndicatorProps) {
  if (pullDistance === 0 && !isRefreshing) return null;

  const progress = Math.min(pullDistance / threshold, 1);

  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
      style={{ height: pullDistance }}
    >
      <div
        className="flex items-center gap-2 text-muted-foreground text-xs"
        style={{ opacity: progress }}
      >
        <Loader2
          className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
          style={{
            transform: isRefreshing ? undefined : `rotate(${progress * 360}deg)`,
          }}
        />
        <span>
          {isRefreshing ? 'Refreshing...' : canRelease ? 'Release to refresh' : 'Pull to refresh'}
        </span>
      </div>
    </div>
  );
}
