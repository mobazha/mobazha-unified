'use client';

import { useSyncExternalStore, useCallback } from 'react';

/**
 * 获取媒体查询的初始值
 */
function getMediaQuerySnapshot(query: string): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(query).matches;
}

/**
 * 获取服务端渲染的默认值
 */
function getServerSnapshot(): boolean {
  return false;
}

/**
 * Hook to detect if a media query matches
 * @param query - CSS media query string (e.g., '(min-width: 768px)')
 * @returns boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      if (typeof window === 'undefined') return () => {};

      const mediaQuery = window.matchMedia(query);

      // 监听变化
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', callback);
      } else {
        // 兼容旧浏览器
        mediaQuery.addListener(callback);
      }

      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', callback);
        } else {
          mediaQuery.removeListener(callback);
        }
      };
    },
    [query]
  );

  const getSnapshot = useCallback(() => getMediaQuerySnapshot(query), [query]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Predefined breakpoints for common use cases
 */
export const breakpoints = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
} as const;

/**
 * Hook to check if device is desktop (lg and above)
 */
export function useIsDesktop(): boolean {
  return useMediaQuery(breakpoints.lg);
}

/**
 * Hook to check if device is tablet (md and above, but not lg)
 */
export function useIsTablet(): boolean {
  const isMd = useMediaQuery(breakpoints.md);
  const isLg = useMediaQuery(breakpoints.lg);
  return isMd && !isLg;
}

/**
 * Hook to check if device is mobile (below md)
 */
export function useIsMobile(): boolean {
  const isMd = useMediaQuery(breakpoints.md);
  return !isMd;
}

export default useMediaQuery;
