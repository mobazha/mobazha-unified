'use client';

/**
 * ThemeProvider 组件
 * 提供主题初始化和防闪烁功能
 */

import React, { useEffect, useRef } from 'react';
import { useTheme } from '@mobazha/core';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // 使用 useTheme 来初始化主题
  useTheme();

  useEffect(() => {
    // 仅在首次挂载时显示内容，避免闪烁
    if (!initializedRef.current && containerRef.current) {
      initializedRef.current = true;
      containerRef.current.style.visibility = 'visible';
    }
  }, []);

  return (
    <div ref={containerRef} style={{ visibility: 'hidden' }}>
      {children}
    </div>
  );
}
