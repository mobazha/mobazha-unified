'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// ============ Types ============

export interface BottomSheetProps {
  /** 是否显示 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 标题（可选） */
  title?: string;
  /** 子内容 */
  children: React.ReactNode;
  /** 自定义类名 */
  className?: string;
}

// ============ Main Component ============

/**
 * 移动端底部弹窗组件
 * - 全屏展示，从底部滑入
 * - 点击遮罩或关闭按钮关闭
 * - 支持滚动内容
 */
export function BottomSheet({ open, onClose, title, children, className }: BottomSheetProps) {
  // 防止背景滚动
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

  // ESC 键关闭
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* 底部弹窗 - 全屏 */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 top-0 bg-background',
          'flex flex-col',
          'transform transition-transform duration-300 ease-out',
          'animate-in slide-in-from-bottom',
          className
        )}
      >
        {/* 头部 - 关闭按钮 */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
          <button
            onClick={onClose}
            className="p-1.5 -ml-1.5 rounded-lg active:bg-muted/50 transition-colors"
            aria-label="关闭"
          >
            <svg
              className="w-5 h-5 text-foreground"
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
          {title && <h2 className="text-base font-semibold text-foreground">{title}</h2>}
          {/* 占位，保持标题居中 */}
          <div className="w-8" />
        </div>

        {/* 内容区域 - 可滚动 */}
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );
}

// ============ Sub Components ============

export interface BottomSheetItemProps {
  /** 标题 */
  title: string;
  /** 描述（可选） */
  description?: string;
  /** 右侧内容（如数量） */
  trailing?: React.ReactNode;
  /** 点击回调 */
  onClick?: () => void;
  /** 是否选中 */
  selected?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 底部弹窗列表项
 */
export function BottomSheetItem({
  title,
  description,
  trailing,
  onClick,
  selected,
  className,
}: BottomSheetItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-between px-4 py-4',
        'border-b border-border/50 last:border-0',
        'active:bg-muted/30 transition-colors text-left',
        selected && 'bg-muted/20',
        className
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-semibold text-foreground">{title}</div>
        {description && (
          <div className="text-[13px] text-muted-foreground mt-0.5 leading-snug">{description}</div>
        )}
      </div>
      {trailing && (
        <div className="ml-4 flex-shrink-0 text-base text-muted-foreground">{trailing}</div>
      )}
    </button>
  );
}

export default BottomSheet;
