'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Check, TrendingUp, Ticket } from 'lucide-react';
import type { Erc3525Holding, ExpectedRevenue } from '@mobazha/core';

interface RwaHoldingCardProps {
  holding: Erc3525Holding;
  expectedRevenue?: ExpectedRevenue;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * RWA 持仓卡片组件
 * 用于展示用户的 ERC3525 持仓
 */
export const RwaHoldingCard = memo(function RwaHoldingCard({
  holding,
  expectedRevenue,
  isSelected = false,
  onClick,
  className,
}: RwaHoldingCardProps) {
  return (
    <article
      onClick={onClick}
      className={cn(
        'relative cursor-pointer overflow-hidden rounded-xl border-2 bg-card p-4 transition-all duration-200',
        'hover:shadow-lg hover:-translate-y-0.5',
        isSelected
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-border hover:border-primary/50',
        className
      )}
      data-testid={`rwa-card-${holding.tokenId}`}
    >
      {/* 头部 */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Ticket className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{holding.name}</h3>
            <p className="text-xs text-muted-foreground">Token ID: {holding.tokenId}</p>
          </div>
        </div>

        {/* 选中标记 */}
        {isSelected && (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* 持仓信息 */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">持有份额</p>
          <p className="text-lg font-bold text-foreground">
            {holding.value.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Slot</p>
          <p className="text-lg font-bold text-foreground">{holding.slot}</p>
        </div>
      </div>

      {/* 预期收益 */}
      {expectedRevenue && (
        <div className="mt-4 rounded-lg bg-muted/50 p-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            预期收益
          </div>
          <div className="mt-2 flex items-baseline gap-4">
            <div>
              <span className="text-sm text-muted-foreground">周收益: </span>
              <span className="font-semibold text-green-600">
                ${expectedRevenue.weekly.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">年化: </span>
              <span className="font-semibold text-green-600">
                ${expectedRevenue.annualized.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 描述 */}
      {holding.description && (
        <p className="mt-3 text-xs text-muted-foreground line-clamp-2">
          {holding.description}
        </p>
      )}
    </article>
  );
});

export default RwaHoldingCard;
