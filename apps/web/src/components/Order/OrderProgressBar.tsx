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
      {/* 进度条容器 */}
      <div className="relative h-6">
        {/* 背景线条 */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-0.5 bg-muted-foreground/30" />

        {/* 已完成线条 */}
        {currentState > 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 left-0 h-0.5 bg-foreground transition-all duration-300"
            style={{
              width: `${((currentState - 1) / (states.length - 1)) * 100}%`,
            }}
          />
        )}

        {/* 节点 */}
        {states.map((state, index) => {
          const stateNumber = index + 1;
          const isCompleted = stateNumber <= currentState;
          const isDisputed = disputeState > 0 && stateNumber === disputeState;
          const isFirst = index === 0;
          const isLast = index === states.length - 1;
          const positionPercent = (index / (states.length - 1)) * 100;

          return (
            <div key={index}>
              {/* 圆点 - 移动端 22px，桌面端 26px */}
              <div
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 z-10',
                  'w-[22px] h-[22px] sm:w-[26px] sm:h-[26px] rounded-full flex items-center justify-center',
                  'transition-all duration-300',
                  // 定位：首节点不偏移，尾节点向左偏移100%，中间向左偏移50%
                  isFirst ? '' : isLast ? '-translate-x-full' : '-translate-x-1/2',
                  isCompleted
                    ? 'bg-foreground text-background'
                    : 'bg-muted border-2 border-muted-foreground/30 text-muted-foreground'
                )}
                style={{ left: `${positionPercent}%` }}
              >
                {isCompleted ? (
                  <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={3} />
                ) : (
                  <span className="text-xs font-medium">{stateNumber}</span>
                )}
              </div>

              {/* 争议标记 */}
              {isDisputed && (
                <div
                  className={cn(
                    'absolute top-0 z-20',
                    isFirst ? 'translate-x-3' : isLast ? '-translate-x-3' : ''
                  )}
                  style={{
                    left: isFirst
                      ? `${positionPercent}%`
                      : isLast
                        ? `calc(${positionPercent}% - 12px)`
                        : `calc(${positionPercent}% + 4px)`,
                  }}
                >
                  <div className="w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm">
                    <AlertCircle className="w-2.5 h-2.5" />
                  </div>
                </div>
              )}

              {/* 标签 - 首尾对齐边界，中间居中 */}
              <span
                className={cn(
                  'absolute top-full mt-2 text-xs whitespace-nowrap',
                  // 对齐方式：首节点左对齐，尾节点右对齐，中间居中
                  isFirst
                    ? 'left-0 text-left'
                    : isLast
                      ? 'right-0 text-right'
                      : 'left-1/2 -translate-x-1/2 text-center',
                  isCompleted ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}
                style={!isFirst && !isLast ? { left: `${positionPercent}%` } : undefined}
              >
                {state}
              </span>
            </div>
          );
        })}
      </div>

      {/* 为标签留出底部空间 */}
      <div className="h-6 sm:h-7" />
    </div>
  );
});

export default OrderProgressBar;
