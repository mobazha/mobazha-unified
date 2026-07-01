'use client';

import React, { useEffect } from 'react';
import { initializeCurrencyStore, cleanupCurrencyStore } from '@mobazha/core';

interface CurrencyProviderProps {
  children: React.ReactNode;
}

/**
 * 货币系统初始化组件
 * 在应用启动时初始化货币 Store，获取汇率数据
 */
export function CurrencyProvider({ children }: CurrencyProviderProps) {
  useEffect(() => {
    // 初始化货币系统
    initializeCurrencyStore();

    // 清理
    return () => {
      cleanupCurrencyStore();
    };
  }, []);

  return <>{children}</>;
}

export default CurrencyProvider;
