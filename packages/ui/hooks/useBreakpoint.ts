'use client';

import { useState, useEffect } from 'react';

/**
 * 响应式断点定义
 */
export const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  large: 1440,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * 响应式断点 Hook
 *
 * @example
 * const { isMobile, isTablet, isDesktop, breakpoint } = useBreakpoint();
 */
export function useBreakpoint() {
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : BREAKPOINTS.desktop
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const breakpoint: Breakpoint =
    windowWidth >= BREAKPOINTS.large
      ? 'large'
      : windowWidth >= BREAKPOINTS.desktop
        ? 'desktop'
        : windowWidth >= BREAKPOINTS.tablet
          ? 'tablet'
          : 'mobile';

  return {
    windowWidth,
    breakpoint,
    isMobile: windowWidth < BREAKPOINTS.tablet,
    isTablet: windowWidth >= BREAKPOINTS.tablet && windowWidth < BREAKPOINTS.desktop,
    isDesktop: windowWidth >= BREAKPOINTS.desktop,
    isLarge: windowWidth >= BREAKPOINTS.large,
  };
}
