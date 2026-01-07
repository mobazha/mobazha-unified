'use client';

import React, { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

interface PageErrorBoundaryProps {
  children: ReactNode;
  pageName?: string;
}

/**
 * PageErrorBoundary - 页面级错误边界
 * 为页面提供统一的错误处理和显示
 */
export function PageErrorBoundary({ children, pageName }: PageErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
          <div className="text-center max-w-md">
            <div className="mx-auto w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              {pageName ? `${pageName} 加载失败` : '页面加载失败'}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              抱歉，页面遇到了问题。请尝试刷新页面或返回上一页。
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => window.history.back()} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回上一页
              </Button>
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新页面
              </Button>
            </div>
          </div>
        </div>
      }
      onError={(error, errorInfo) => {
        // 在这里可以发送错误到监控服务
        console.error(`[PageError${pageName ? ` - ${pageName}` : ''}]`, error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export default PageErrorBoundary;
