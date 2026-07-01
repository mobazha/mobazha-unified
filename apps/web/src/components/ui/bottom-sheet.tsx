'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  /** Use full-screen height (default: auto-height up to 85vh) */
  fullScreen?: boolean;
}

/**
 * Mobile bottom sheet with drag-to-dismiss, backdrop, and optional full-screen mode.
 * Hidden on lg+ viewports.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
  fullScreen = false,
}: BottomSheetProps) {
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const dragStartY = React.useRef(0);
  const dragDelta = React.useRef(0);
  const isDragging = React.useRef(false);

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  const handleDragStart = React.useCallback((clientY: number) => {
    dragStartY.current = clientY;
    dragDelta.current = 0;
    isDragging.current = true;
  }, []);

  const handleDragMove = React.useCallback((clientY: number) => {
    if (!isDragging.current) return;
    const delta = clientY - dragStartY.current;
    dragDelta.current = Math.max(0, delta);
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${dragDelta.current}px)`;
      sheetRef.current.style.transition = 'none';
    }
  }, []);

  const handleDragEnd = React.useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (sheetRef.current) {
      sheetRef.current.style.transition = '';
      sheetRef.current.style.transform = '';
    }
    if (dragDelta.current > 100) {
      onClose();
    }
    dragDelta.current = 0;
  }, [onClose]);

  const onTouchStart = React.useCallback(
    (e: React.TouchEvent) => handleDragStart(e.touches[0].clientY),
    [handleDragStart]
  );
  const onTouchMove = React.useCallback(
    (e: React.TouchEvent) => handleDragMove(e.touches[0].clientY),
    [handleDragMove]
  );
  const onTouchEnd = React.useCallback(() => handleDragEnd(), [handleDragEnd]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/40 animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={sheetRef}
        className={cn(
          'absolute inset-x-0 bottom-0 bg-background',
          'flex flex-col',
          'rounded-t-2xl',
          'transition-transform duration-300 ease-out',
          'animate-in slide-in-from-bottom duration-300',
          fullScreen ? 'top-0 rounded-t-none' : 'max-h-[85vh]',
          className
        )}
      >
        {/* Drag handle */}
        <div
          className="flex-shrink-0 flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex-shrink-0 flex items-center justify-between px-4 pb-3 border-b border-border">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 -mr-1.5 rounded-lg active:bg-muted/50 transition-colors"
              aria-label="Close"
            >
              <svg
                className="w-5 h-5 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );
}

// ============ Sub Components ============

export interface BottomSheetItemProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

export function BottomSheetItem({
  title,
  description,
  icon,
  trailing,
  onClick,
  selected,
  className,
}: BottomSheetItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-4',
        'border-b border-border/50 last:border-0',
        'active:bg-muted/30 transition-colors text-left min-h-[48px]',
        selected && 'bg-primary/5',
        className
      )}
    >
      {icon && <div className="flex-shrink-0 text-muted-foreground">{icon}</div>}
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            'text-[15px] font-medium',
            selected ? 'text-primary font-semibold' : 'text-foreground'
          )}
        >
          {title}
        </div>
        {description && (
          <div className="text-[13px] text-muted-foreground mt-0.5 leading-snug">{description}</div>
        )}
      </div>
      {trailing && <div className="ml-3 flex-shrink-0 text-muted-foreground">{trailing}</div>}
      {selected && !trailing && (
        <svg
          className="w-5 h-5 text-primary flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

export default BottomSheet;
