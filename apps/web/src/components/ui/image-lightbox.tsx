'use client';

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, X, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ImageLightboxProps {
  imageUrls?: string[];
  open: boolean;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onOpenChange: (open: boolean) => void;
  variant?: 'content' | 'product';
  altPrefix?: string;
  ariaLabel?: string;
  loopNavigation?: boolean;
  showThumbnails?: boolean;
  showCount?: boolean;
  downloadUrl?: string;
  className?: string;
  testIdPrefix?: string;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const ZOOM_STEP = 2;
const SWIPE_THRESHOLD = 50;
const DOUBLE_TAP_DELAY = 300;

function clampScale(s: number) {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
}

function getTouchDistance(t1: React.Touch, t2: React.Touch) {
  return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
}

export const ImageLightbox = memo(function ImageLightbox({
  imageUrls,
  open,
  selectedIndex,
  onSelectIndex,
  onOpenChange,
  variant = 'content',
  altPrefix = 'Image',
  ariaLabel = 'Image preview',
  loopNavigation = true,
  showThumbnails = true,
  showCount = true,
  downloadUrl,
  className,
  testIdPrefix = 'image-lightbox',
}: ImageLightboxProps) {
  const safeImageUrls = useMemo(
    () => (Array.isArray(imageUrls) ? imageUrls.filter(Boolean) : []),
    [imageUrls]
  );
  const [isVisible, setIsVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Zoom state: origin-based (not translate-based)
  const [scale, setScale] = useState(1);
  const [origin, setOrigin] = useState('50% 50%');
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isZoomed = scale > 1.05;

  const imgRef = useRef<HTMLImageElement>(null);

  // Gesture tracking refs (no re-renders during gesture)
  const dragRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    panStartX: 0,
    panStartY: 0,
  });
  const clickDebounceRef = useRef(false);
  const pinchRef = useRef({
    active: false,
    startDist: 0,
    startScale: 1,
  });
  const lastTapRef = useRef(0);
  const swipeStartRef = useRef<number | null>(null);

  const imageCount = safeImageUrls.length;
  const hasMultipleImages = imageCount > 1;
  const normalizedIndex =
    imageCount === 0 ? 0 : Math.min(Math.max(selectedIndex, 0), imageCount - 1);

  const resetZoom = useCallback(() => {
    setScale(1);
    setOrigin('50% 50%');
    setPan({ x: 0, y: 0 });
  }, []);

  const closePreview = useCallback(() => {
    setIsVisible(false);
    setIsDragging(false);
    dragRef.current.active = false;
    resetZoom();
    const timer = setTimeout(() => onOpenChange(false), 200);
    return () => clearTimeout(timer);
  }, [onOpenChange, resetZoom]);

  const selectPrevious = useCallback(() => {
    if (imageCount <= 1) return;
    if (loopNavigation) {
      onSelectIndex(normalizedIndex === 0 ? imageCount - 1 : normalizedIndex - 1);
    } else if (normalizedIndex > 0) {
      onSelectIndex(normalizedIndex - 1);
    }
  }, [imageCount, loopNavigation, normalizedIndex, onSelectIndex]);

  const selectNext = useCallback(() => {
    if (imageCount <= 1) return;
    if (loopNavigation) {
      onSelectIndex(normalizedIndex === imageCount - 1 ? 0 : normalizedIndex + 1);
    } else if (normalizedIndex < imageCount - 1) {
      onSelectIndex(normalizedIndex + 1);
    }
  }, [imageCount, loopNavigation, normalizedIndex, onSelectIndex]);

  // Reset zoom when switching images
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- zoom must reset when the active image changes
    resetZoom();
  }, [normalizedIndex, resetZoom]);

  useEffect(() => {
    if (open && imageCount > 0) {
      requestAnimationFrame(() => setIsVisible(true));
    }
  }, [open, imageCount]);

  // Keyboard
  useEffect(() => {
    if (!open || imageCount === 0) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isZoomed) resetZoom();
        else closePreview();
        return;
      }
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setScale(s => clampScale(s + 0.5));
      } else if (e.key === '-') {
        e.preventDefault();
        const next = clampScale(scale - 0.5);
        if (next <= 1) resetZoom();
        else setScale(next);
      }
      if (isZoomed) return;
      if (!hasMultipleImages) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        selectPrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        selectNext();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', handleKey);
    };
  }, [
    closePreview,
    hasMultipleImages,
    imageCount,
    isZoomed,
    open,
    resetZoom,
    scale,
    selectNext,
    selectPrevious,
  ]);

  // --- Compute origin from click/tap point ---
  const getOriginFromEvent = useCallback((clientX: number, clientY: number): string => {
    const img = imgRef.current;
    if (!img) return '50% 50%';
    const rect = img.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return `${Math.max(0, Math.min(100, x))}% ${Math.max(0, Math.min(100, y))}%`;
  }, []);

  // --- Mouse: wheel zoom ---
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.stopPropagation();
      const next = clampScale(scale + (e.deltaY > 0 ? -0.3 : 0.3));
      if (next <= 1) {
        resetZoom();
      } else {
        if (!isZoomed) {
          setOrigin(getOriginFromEvent(e.clientX, e.clientY));
          setPan({ x: 0, y: 0 });
        }
        setScale(next);
      }
    },
    [scale, isZoomed, resetZoom, getOriginFromEvent]
  );

  // --- Mouse: click-to-zoom + drag-to-pan ---
  const DRAG_THRESHOLD = 4;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const d = dragRef.current;
      d.active = true;
      d.moved = false;
      setIsDragging(true);
      d.startX = e.clientX;
      d.startY = e.clientY;
      d.panStartX = pan.x;
      d.panStartY = pan.y;
    },
    [pan]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d.active) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (!d.moved && Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) {
        d.moved = true;
      }
      if (d.moved && isZoomed) {
        setPan({
          x: d.panStartX + dx,
          y: d.panStartY + dy,
        });
      }
    };
    const handleMouseUp = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d.active) return;
      d.active = false;
      setIsDragging(false);

      if (!d.moved && !clickDebounceRef.current) {
        clickDebounceRef.current = true;
        setTimeout(() => {
          clickDebounceRef.current = false;
        }, 350);

        if (isZoomed) {
          resetZoom();
        } else {
          setOrigin(getOriginFromEvent(e.clientX, e.clientY));
          setPan({ x: 0, y: 0 });
          setScale(ZOOM_STEP);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isZoomed, resetZoom, getOriginFromEvent]);

  // --- Touch handlers ---
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      // Pinch (2 fingers)
      if (e.touches.length === 2) {
        pinchRef.current = {
          active: true,
          startDist: getTouchDistance(e.touches[0], e.touches[1]),
          startScale: scale,
        };
        return;
      }

      if (e.touches.length !== 1) return;

      // Double-tap detection
      const now = Date.now();
      if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
        lastTapRef.current = 0;
        if (isZoomed) {
          resetZoom();
        } else {
          setOrigin(getOriginFromEvent(e.touches[0].clientX, e.touches[0].clientY));
          setPan({ x: 0, y: 0 });
          setScale(ZOOM_STEP);
        }
        return;
      }
      lastTapRef.current = now;

      if (isZoomed) {
        // Pan start
        const d = dragRef.current;
        d.active = true;
        setIsDragging(true);
        d.startX = e.touches[0].clientX;
        d.startY = e.touches[0].clientY;
        d.panStartX = pan.x;
        d.panStartY = pan.y;
      } else {
        // Swipe start
        swipeStartRef.current = e.touches[0].clientX;
      }
    },
    [isZoomed, pan, resetZoom, scale, getOriginFromEvent]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      // Pinch
      if (pinchRef.current.active && e.touches.length === 2) {
        e.preventDefault();
        const dist = getTouchDistance(e.touches[0], e.touches[1]);
        const next = clampScale(pinchRef.current.startScale * (dist / pinchRef.current.startDist));
        if (next <= 1) {
          resetZoom();
        } else {
          if (!isZoomed) {
            const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            setOrigin(getOriginFromEvent(mx, my));
            setPan({ x: 0, y: 0 });
          }
          setScale(next);
        }
        return;
      }

      // Pan (zoomed, single finger)
      const d = dragRef.current;
      if (d.active && e.touches.length === 1) {
        e.preventDefault();
        setPan({
          x: d.panStartX + (e.touches[0].clientX - d.startX),
          y: d.panStartY + (e.touches[0].clientY - d.startY),
        });
      }
    },
    [isZoomed, resetZoom, getOriginFromEvent]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (pinchRef.current.active) {
        pinchRef.current.active = false;
        if (scale < 1.1) resetZoom();
        return;
      }

      dragRef.current.active = false;
      setIsDragging(false);

      // Swipe navigation (only when not zoomed)
      if (swipeStartRef.current !== null && e.changedTouches.length > 0 && hasMultipleImages) {
        const delta = e.changedTouches[0].clientX - swipeStartRef.current;
        if (delta > SWIPE_THRESHOLD) selectPrevious();
        else if (delta < -SWIPE_THRESHOLD) selectNext();
        swipeStartRef.current = null;
      }
    },
    [hasMultipleImages, resetZoom, scale, selectNext, selectPrevious]
  );

  // --- Toolbar zoom buttons ---
  const handleZoomIn = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (!isZoomed) {
        setOrigin('50% 50%');
        setPan({ x: 0, y: 0 });
      }
      setScale(s => clampScale(s + 0.5));
    },
    [isZoomed]
  );

  const handleZoomOut = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const next = clampScale(scale - 0.5);
      if (next <= 1) {
        resetZoom();
      } else {
        setScale(next);
      }
    },
    [scale, resetZoom]
  );

  if (!open || imageCount === 0) return null;

  const currentImageUrl = safeImageUrls[normalizedIndex];
  const canGoPrevious = loopNavigation || normalizedIndex > 0;
  const canGoNext = loopNavigation || normalizedIndex < imageCount - 1;
  const isProductVariant = variant === 'product';

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md transition-opacity duration-200',
        isVisible ? 'opacity-100' : 'opacity-0',
        className
      )}
      onClick={isZoomed ? resetZoom : closePreview}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      data-testid={`${testIdPrefix}-root`}
      style={{ touchAction: 'none' }}
    >
      {/* Top bar — stopPropagation on the entire bar */}
      <div
        className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-3 py-2 sm:px-6 sm:py-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          {showCount && hasMultipleImages && (
            <div className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium tabular-nums text-white/90 backdrop-blur-sm sm:px-3 sm:py-1 sm:text-sm">
              {normalizedIndex + 1} / {imageCount}
            </div>
          )}
          {isZoomed && (
            <div className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs tabular-nums text-white/70 backdrop-blur-sm sm:text-sm">
              {Math.round(scale * 100)}%
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {isProductVariant && (
            <>
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={scale <= MIN_SCALE}
                className="hidden min-h-[40px] min-w-[40px] items-center justify-center rounded-full bg-white/10 text-white/80 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white focus:outline-none disabled:opacity-30 sm:flex"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={scale >= MAX_SCALE}
                className="hidden min-h-[40px] min-w-[40px] items-center justify-center rounded-full bg-white/10 text-white/80 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white focus:outline-none disabled:opacity-30 sm:flex"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" aria-hidden />
              </button>
            </>
          )}
          {downloadUrl && (
            <a
              href={downloadUrl}
              download
              className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full bg-white/10 text-white/80 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/70 sm:min-h-[44px] sm:min-w-[44px]"
              aria-label="Download image"
              data-testid={`${testIdPrefix}-download`}
            >
              <Download className="h-4.5 w-4.5 sm:h-5 sm:w-5" aria-hidden />
            </a>
          )}
          <button
            type="button"
            onClick={closePreview}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full bg-white/10 text-white/80 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/70 sm:min-h-[44px] sm:min-w-[44px]"
            aria-label="Close image preview"
            data-testid={`${testIdPrefix}-close`}
          >
            <X className="h-4.5 w-4.5 sm:h-5 sm:w-5" aria-hidden />
          </button>
        </div>
      </div>

      {/* Navigation arrows — desktop only, hidden when zoomed */}
      {hasMultipleImages && !isZoomed && (
        <>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              selectPrevious();
            }}
            disabled={!canGoPrevious}
            className={cn(
              'absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/80 backdrop-blur-sm transition-all hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/70 disabled:cursor-not-allowed disabled:opacity-30 sm:flex sm:left-4',
              isProductVariant
                ? 'sm:min-h-[52px] sm:min-w-[52px]'
                : 'sm:min-h-[44px] sm:min-w-[44px]'
            )}
            aria-label="Previous image"
            data-testid={`${testIdPrefix}-prev`}
          >
            <ChevronLeft
              className={cn('h-6 w-6', isProductVariant && 'sm:h-7 sm:w-7')}
              aria-hidden
            />
          </button>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              selectNext();
            }}
            disabled={!canGoNext}
            className={cn(
              'absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/80 backdrop-blur-sm transition-all hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/70 disabled:cursor-not-allowed disabled:opacity-30 sm:flex sm:right-4',
              isProductVariant
                ? 'sm:min-h-[52px] sm:min-w-[52px]'
                : 'sm:min-h-[44px] sm:min-w-[44px]'
            )}
            aria-label="Next image"
            data-testid={`${testIdPrefix}-next`}
          >
            <ChevronRight
              className={cn('h-6 w-6', isProductVariant && 'sm:h-7 sm:w-7')}
              aria-hidden
            />
          </button>
        </>
      )}

      {/* Main image area — no overflow-hidden so zoomed image expands into the backdrop */}
      <div
        className={cn(
          'z-10 flex items-center justify-center',
          isProductVariant
            ? 'max-h-[calc(100dvh-6rem)] max-w-[calc(100vw-1rem)] sm:max-h-[calc(100dvh-10rem)] sm:max-w-[calc(100vw-10rem)]'
            : 'max-h-[calc(100dvh-4rem)] max-w-[95vw] sm:max-h-[85vh] sm:max-w-[92vw]'
        )}
        onClick={e => e.stopPropagation()}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: isZoomed ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in' }}
      >
        <img
          ref={imgRef}
          src={currentImageUrl}
          alt={`${altPrefix} ${normalizedIndex + 1}`}
          className={cn(
            'select-none object-contain',
            isZoomed ? '' : 'max-h-full max-w-full transition-transform duration-200',
            isProductVariant ? 'rounded-lg shadow-2xl' : 'rounded-lg'
          )}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: origin,
            ...(isZoomed
              ? {
                  maxHeight: 'none',
                  maxWidth: 'none',
                }
              : {}),
          }}
          draggable={false}
        />
      </div>

      {/* Zoom hint (mobile, product variant) */}
      {isProductVariant && !isZoomed && (
        <div className="absolute bottom-20 left-1/2 z-10 -translate-x-1/2 animate-pulse rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/60 backdrop-blur-sm sm:hidden">
          <ZoomIn className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          Tap to zoom
        </div>
      )}

      {/* Bottom thumbnails — hidden when zoomed */}
      {showThumbnails && hasMultipleImages && !isZoomed && (
        <div
          className={cn(
            'absolute bottom-3 left-1/2 z-10 flex max-w-[90vw] -translate-x-1/2 gap-1.5 overflow-x-auto rounded-xl bg-black/40 p-1.5 backdrop-blur-md sm:bottom-6 sm:gap-2 sm:p-2',
            isProductVariant && 'sm:gap-2.5 sm:p-2.5'
          )}
          onClick={e => e.stopPropagation()}
        >
          {safeImageUrls.map((url, index) => (
            <button
              key={`${url}-${index}`}
              type="button"
              onClick={() => onSelectIndex(index)}
              className={cn(
                'flex-shrink-0 overflow-hidden rounded-md border-2 transition-all focus:outline-none focus:ring-2 focus:ring-white/70 sm:rounded-lg',
                isProductVariant ? 'h-11 w-11 sm:h-16 sm:w-16' : 'h-10 w-10 sm:h-12 sm:w-12',
                normalizedIndex === index
                  ? 'border-white shadow-lg shadow-white/20'
                  : 'border-transparent opacity-50 hover:opacity-90'
              )}
              aria-label={`View image ${index + 1}`}
              data-testid={`${testIdPrefix}-thumbnail`}
            >
              <img
                src={url}
                alt={`${altPrefix} thumbnail ${index + 1}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
