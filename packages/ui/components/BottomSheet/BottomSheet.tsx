'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { useDrag } from '@use-gesture/react';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Title shown in the sheet header */
  title?: string;
  /** Max height as CSS value. Default: '85vh' */
  maxHeight?: string;
  /** Snap points as fraction of viewport height. Default: close on drag */
  snapPoints?: number[];
  /** Show the drag handle indicator. Default: true */
  showHandle?: boolean;
}

const CLOSE_THRESHOLD = 100;
const VELOCITY_THRESHOLD = 0.5;

export function BottomSheet({
  open,
  onClose,
  children,
  title,
  maxHeight = '85vh',
  showHandle = true,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const translateY = useRef(0);

  const applyTransform = useCallback((y: number) => {
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${Math.max(0, y)}px)`;
    }
  }, []);

  const resetTransform = useCallback(() => {
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)';
      sheetRef.current.style.transform = 'translateY(0)';
      const handler = () => {
        if (sheetRef.current) sheetRef.current.style.transition = '';
      };
      sheetRef.current.addEventListener('transitionend', handler, { once: true });
    }
  }, []);

  const animateClose = useCallback(() => {
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)';
      sheetRef.current.style.transform = 'translateY(100%)';
      const handler = () => {
        onClose();
        if (sheetRef.current) sheetRef.current.style.transition = '';
      };
      sheetRef.current.addEventListener('transitionend', handler, { once: true });
    }
  }, [onClose]);

  const bind = useDrag(
    ({ movement: [, my], velocity: [, vy], last }) => {
      if (!open) return;

      // Only allow downward drag from sheet header area
      if (my < 0) {
        applyTransform(0);
        return;
      }

      if (!last) {
        translateY.current = my;
        applyTransform(my);
        return;
      }

      if (my > CLOSE_THRESHOLD || vy > VELOCITY_THRESHOLD) {
        animateClose();
      } else {
        resetTransform();
      }
    },
    { filterTaps: true, from: () => [0, translateY.current] }
  );

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [open]);

  // Handle escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 animate-in fade-in-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Bottom sheet'}
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-background shadow-lg animate-in slide-in-from-bottom"
        style={{ maxHeight }}
      >
        {/* Drag handle area */}
        <div {...bind()} className="touch-none cursor-grab active:cursor-grabbing pt-3 pb-2">
          {showHandle && <div className="mx-auto w-10 h-1 rounded-full bg-muted-foreground/30" />}
          {title && <h2 className="text-center text-base font-semibold mt-2 px-4">{title}</h2>}
        </div>

        {/* Scrollable content */}
        <div
          ref={contentRef}
          className="overflow-y-auto overscroll-contain px-4 pb-[env(safe-area-inset-bottom,16px)]"
          style={{ maxHeight: `calc(${maxHeight} - 60px)` }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
