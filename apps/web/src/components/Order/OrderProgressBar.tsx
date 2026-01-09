'use client';

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { Check, AlertCircle } from 'lucide-react';

export interface OrderProgressBarProps {
  /** 步骤名称数组 */
  states: string[];
  /** 当前步骤 (1-based，0表示进度条为空) */
  currentState: number;
  /** 争议发生的步骤（可选，0表示无争议） */
  disputeState?: number;
  /** 自定义类名 */
  className?: string;
}

/**
 * 订单进度条组件
 *
 * 采用原版桌面端的布局方式：
 * - 首尾步骤占半份宽度
 * - 中间步骤占整份宽度
 * - 线条自然连接，不会超出首尾节点
 */
export const OrderProgressBar = memo(function OrderProgressBar({
  states,
  currentState,
  disputeState = 0,
  className,
}: OrderProgressBarProps) {
  // 验证 props
  if (!Array.isArray(states) || states.length < 2) {
    console.error('OrderProgressBar: states 必须是至少包含2个元素的数组');
    return null;
  }

  if (currentState < 0 || currentState > states.length) {
    console.error('OrderProgressBar: currentState 必须在 0 到 states.length 之间');
    return null;
  }

  // 计算每个步骤的宽度百分比（原版算法）
  const getStateWidth = (index: number) => {
    // 首尾步骤占半份宽度，中间步骤占整份宽度
    const isFirstOrLast = index === 0 || index === states.length - 1;
    const width = isFirstOrLast ? 0.5 / (states.length - 1) : 1 / (states.length - 1);
    return width * 100;
  };

  return (
    <div
      className={cn('relative w-full', className)}
      role="progressbar"
      aria-valuenow={currentState}
      aria-valuemin={0}
      aria-valuemax={states.length}
    >
      {/* 进度条容器 - 使用 flex 布局 */}
      <div className="flex h-6 relative">
        {states.map((state, index) => {
          const stateNumber = index + 1;
          const isCompleted = stateNumber <= currentState;
          const isDisputed = disputeState > 0 && stateNumber === disputeState;
          const isFirst = index === 0;
          const isLast = index === states.length - 1;

          return (
            <div key={index} className="relative h-6" style={{ width: `${getStateWidth(index)}%` }}>
              {/* 线条 - 贯穿整个 section */}
              <div
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 left-0 right-0 h-0.5',
                  isCompleted ? 'bg-foreground' : 'bg-muted-foreground/30'
                )}
              />

              {/* 圆点 - 移动端 20px，桌面端 24px */}
              <div
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 z-10',
                  'w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center',
                  'transition-all duration-300',
                  // 位置：首节点左边、尾节点右边、其他居中
                  isFirst
                    ? 'left-0 -translate-x-1/2'
                    : isLast
                      ? 'right-0 translate-x-1/2'
                      : 'left-1/2 -translate-x-1/2',
                  // 样式
                  isCompleted
                    ? 'bg-foreground text-background'
                    : 'bg-muted border-2 border-muted-foreground/30 text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={3} />
                ) : (
                  <span className="text-[9px] sm:text-[10px] font-medium">{stateNumber}</span>
                )}
              </div>

              {/* 争议标记 */}
              {isDisputed && (
                <div
                  className={cn(
                    'absolute top-0 z-20',
                    isFirst ? 'left-1.5' : isLast ? 'right-1.5' : 'left-1/2 translate-x-0.5'
                  )}
                >
                  <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm">
                    <AlertCircle className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                  </div>
                </div>
              )}

              {/* 标签 - 移动端 10px，首尾对齐边界 */}
              <span
                className={cn(
                  'absolute top-full mt-1 text-[10px] sm:text-[11px]',
                  // 位置：首节点左对齐，尾节点右对齐，其他居中
                  isFirst
                    ? 'left-0 text-left'
                    : isLast
                      ? 'right-0 text-right'
                      : 'left-1/2 -translate-x-1/2 text-center',
                  // 样式
                  isCompleted ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}
              >
                {state}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default OrderProgressBar;
