'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

const starPath =
  'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z';

const sizeMap = {
  xs: { star: 'w-3 h-3', touch: 'w-5 h-5' },
  sm: { star: 'w-3.5 h-3.5', touch: 'w-7 h-7' },
  md: { star: 'w-5 h-5', touch: 'w-9 h-9' },
  lg: { star: 'w-7 h-7', touch: 'w-11 h-11' },
} as const;

type Size = keyof typeof sizeMap;

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: Size;
  count?: number;
  className?: string;
}

export function StarRating({
  value,
  onChange,
  size = 'md',
  count = 5,
  className,
}: StarRatingProps) {
  const [hover, setHover] = useState(0);
  const interactive = !!onChange;
  const { star: starSize, touch: touchSize } = sizeMap[size];

  const handleClick = useCallback(
    (star: number) => {
      onChange?.(star);
    },
    [onChange]
  );

  return (
    <div
      className={cn('flex items-center gap-0.5', className)}
      role={interactive ? 'radiogroup' : undefined}
    >
      {Array.from({ length: count }, (_, i) => {
        const star = i + 1;
        const filled = star <= (interactive ? hover || value : Math.round(value));

        if (interactive) {
          return (
            <button
              key={star}
              type="button"
              className={cn(
                touchSize,
                'flex items-center justify-center rounded-md transition-transform',
                'hover:scale-110 motion-reduce:transform-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
              )}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              onClick={() => handleClick(star)}
              role="radio"
              aria-checked={star === value}
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
              data-testid={`star-${star}`}
            >
              <svg
                className={cn(
                  starSize,
                  'transition-colors',
                  filled ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/30'
                )}
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d={starPath} />
              </svg>
            </button>
          );
        }

        return (
          <svg
            key={star}
            className={cn(starSize, filled ? 'text-warning' : 'text-muted-foreground/40')}
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d={starPath} />
          </svg>
        );
      })}
    </div>
  );
}
