'use client';

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface ImageThumbnailsProps {
  imageUrls?: string[];
  activeIndex?: number;
  onSelect: (index: number) => void;
  altPrefix?: string;
  className?: string;
  itemClassName?: string;
  imageClassName?: string;
  activeClassName?: string;
  inactiveClassName?: string;
  dataTestIdPrefix?: string;
  maxVisible?: number;
  getAriaLabel?: (index: number) => string;
}

export const ImageThumbnails = memo(function ImageThumbnails({
  imageUrls,
  activeIndex,
  onSelect,
  altPrefix = 'Image',
  className,
  itemClassName,
  imageClassName,
  activeClassName = 'border-primary ring-2 ring-primary/20',
  inactiveClassName = 'border-transparent hover:border-border',
  dataTestIdPrefix = 'image-thumbnail',
  maxVisible,
  getAriaLabel,
}: ImageThumbnailsProps) {
  const safeImageUrls = useMemo(
    () => (Array.isArray(imageUrls) ? imageUrls.filter(Boolean) : []),
    [imageUrls]
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const visibleImages =
    typeof maxVisible === 'number' ? safeImageUrls.slice(0, maxVisible) : safeImageUrls;

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState, visibleImages.length]);

  useEffect(() => {
    if (activeIndex == null || !scrollRef.current) return;
    const container = scrollRef.current;
    const activeEl = container.children[activeIndex] as HTMLElement | undefined;
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [activeIndex]);

  if (visibleImages.length === 0) {
    return null;
  }

  return (
    <div className={cn('relative', className)}>
      {canScrollLeft && (
        <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-[1] w-6 bg-gradient-to-r from-background to-transparent" />
      )}
      <div ref={scrollRef} className="flex gap-2 overflow-x-auto scrollbar-hide">
        {visibleImages.map((url, index) => (
          <button
            key={`${url}-${index}`}
            type="button"
            onClick={() => onSelect(index)}
            aria-label={getAriaLabel?.(index) || `View image ${index + 1}`}
            data-testid={`${dataTestIdPrefix}-${index}`}
            className={cn(
              'flex-shrink-0 overflow-hidden rounded-md border-2 transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              activeIndex === index ? activeClassName : inactiveClassName,
              itemClassName
            )}
          >
            <img
              src={url}
              alt={`${altPrefix} ${index + 1}`}
              className={cn('h-full w-full object-cover', imageClassName)}
              loading="lazy"
            />
          </button>
        ))}
      </div>
      {canScrollRight && (
        <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-[1] w-6 bg-gradient-to-l from-background to-transparent" />
      )}
    </div>
  );
});
