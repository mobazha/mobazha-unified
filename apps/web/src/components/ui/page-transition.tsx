'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps page content with a CSS-only entrance animation.
 * Mobile: fade + slide-up (12px). Desktop: simple fade.
 * Uses prefers-reduced-motion to disable for accessibility.
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  return <div className={cn('animate-page-enter', className)}>{children}</div>;
}
