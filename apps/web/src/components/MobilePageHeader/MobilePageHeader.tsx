'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@mobazha/core';
import { usePlatform } from '@mobazha/ui/hooks';
import { useBackAction } from '@/lib/platform';

export interface MobilePageHeaderProps {
  /** 页面标题 */
  title?: string;
  /** 是否显示返回按钮，默认 true */
  showBack?: boolean;
  /** 自定义返回处理 */
  onBack?: () => void;
  /** 右侧操作区域 */
  rightAction?: React.ReactNode;
  /** 是否透明背景 */
  transparent?: boolean;
  /** 自定义类名 */
  className?: string;
  /**
   * Mark as a root tab page (Home/Purchases/Cart/Messages/Me).
   * In embedded apps (TMA), the entire header is hidden because
   * L1 (native header) + bottom nav already provide full context.
   */
  rootTab?: boolean;
}

/**
 * 移动端页面顶部导航栏
 * - 仅在移动端显示（lg:hidden）
 * - 原生 App 风格：返回箭头 + 居中标题
 * - TG/Discord: 优先使用原生 BackButton（TGBackButtonManager）；不可用时回退页内箭头
 */
export function MobilePageHeader({
  title,
  showBack = true,
  onBack,
  rightAction,
  transparent = false,
  className = '',
  rootTab = false,
}: MobilePageHeaderProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { isEmbeddedApp } = usePlatform();
  const back = useBackAction();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  // Root tab pages in embedded apps: L1 (native header) + bottom nav
  // already provide full context — this header is pure redundancy.
  if (rootTab && isEmbeddedApp) {
    return null;
  }

  // Embedded apps: rely on TG native BackButton when available; otherwise
  // render an in-page arrow so product/checkout pages are never stuck.
  if (isEmbeddedApp) {
    const showInPageBack = showBack && !back.isNative;

    return (
      <div
        className={`sticky top-0 z-40 lg:hidden ${
          transparent
            ? 'bg-transparent'
            : 'bg-background/95 backdrop-blur-sm border-b border-border'
        } ${className}`}
      >
        <div className="flex items-center justify-between h-12 px-1">
          {showInPageBack ? (
            <button
              onClick={handleBack}
              className="w-11 h-11 flex items-center justify-center text-foreground touch-feedback rounded-full active:bg-muted/50"
              aria-label={t('common.back')}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          ) : (
            <div className="w-11 h-11 shrink-0" />
          )}
          {title && (
            <h1 className="flex-1 text-lg font-semibold text-foreground truncate px-2">{title}</h1>
          )}
          {rightAction ? (
            <div className="flex items-center shrink-0">{rightAction}</div>
          ) : (
            <div className="w-11 h-11 shrink-0" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`sticky top-0 z-40 lg:hidden ${
        transparent ? 'bg-transparent' : 'bg-background/95 backdrop-blur-sm border-b border-border'
      } ${className}`}
    >
      <div className="flex items-center justify-between h-12 px-1">
        {/* 左侧返回按钮 — 44px 触摸目标 */}
        {showBack ? (
          <button
            onClick={handleBack}
            className="w-11 h-11 flex items-center justify-center text-foreground touch-feedback rounded-full active:bg-muted/50"
            aria-label={t('common.back')}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        ) : (
          <div className="w-11 h-11" />
        )}

        {/* 中间标题 */}
        {title && (
          <span className="text-sm font-medium text-foreground truncate max-w-[60%]">{title}</span>
        )}

        {/* 右侧操作区域 */}
        {rightAction ? (
          <div className="flex items-center">{rightAction}</div>
        ) : (
          <div className="w-11 h-11" />
        )}
      </div>
    </div>
  );
}
