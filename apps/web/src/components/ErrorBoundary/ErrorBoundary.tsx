'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary - 错误边界组件
 * 捕获子组件树中的 JavaScript 错误，记录错误并显示备用 UI
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // 调用自定义错误处理器
    this.props.onError?.(error, errorInfo);

    // 在开发环境记录错误
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // TODO: 发送到错误监控服务 (如 Sentry)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, showDetails = process.env.NODE_ENV === 'development' } = this.props;

    if (hasError) {
      // 如果提供了自定义 fallback，使用它
      if (fallback) {
        return fallback;
      }

      // 默认错误 UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-error/15 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-error" />
              </div>
              <CardTitle className="text-xl">出错了</CardTitle>
              <CardDescription>
                页面遇到了一个错误。这可能是暂时性问题，请尝试刷新页面。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 错误详情（仅开发环境） */}
              {showDetails && error && (
                <div className="p-4 bg-error/15 border border-error/30 rounded-lg overflow-auto">
                  <div className="flex items-center gap-2 mb-2">
                    <Bug className="w-4 h-4 text-error" />
                    <span className="text-sm font-medium text-error">
                      错误详情（仅开发环境可见）
                    </span>
                  </div>
                  <p className="text-sm text-error font-mono break-all">{error.message}</p>
                  {errorInfo && (
                    <details className="mt-2">
                      <summary className="text-xs text-error cursor-pointer">组件堆栈</summary>
                      <pre className="mt-2 text-xs text-error whitespace-pre-wrap">
                        {errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={this.handleReset} variant="outline" className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  重试
                </Button>
                <Button onClick={this.handleReload} variant="outline" className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  刷新页面
                </Button>
                <Button onClick={this.handleGoHome} className="flex-1">
                  <Home className="w-4 h-4 mr-2" />
                  返回首页
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
