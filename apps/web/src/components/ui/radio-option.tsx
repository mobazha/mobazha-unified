'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RadioOptionProps {
  /** 显示的标签文本 */
  label: string;
  /** 是否选中 */
  selected: boolean;
  /** 点击回调 */
  onClick: () => void;
  /** 可选的徽章/图标，显示在标签前 */
  badge?: React.ReactNode;
  /** 自定义类名 */
  className?: string;
}

/**
 * 单选项组件
 * 用于侧边栏筛选等场景，支持可选的徽章显示
 */
export const RadioOption: React.FC<RadioOptionProps> = ({
  label,
  selected,
  onClick,
  badge,
  className,
}) => (
  <button
    onClick={onClick}
    className={cn(
      'flex items-center gap-2 w-full py-1.5 transition-colors text-left text-sm',
      selected ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground',
      className
    )}
  >
    <span
      className={cn(
        'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
        selected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
      )}
    >
      {selected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
    </span>
    {badge}
    <span className={badge ? 'flex-1' : ''}>{label}</span>
  </button>
);

export default RadioOption;
