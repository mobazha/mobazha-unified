'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TokenConfig, ChainConfig } from './types';
import { getChainById } from './config';
import { TokenIcon } from './TokenIcon';

export interface CryptoTokenCardProps {
  token: TokenConfig;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export const CryptoTokenCard: React.FC<CryptoTokenCardProps> = ({
  token,
  selected,
  onClick,
  disabled = false,
  className,
}) => {
  const chain: ChainConfig | undefined = getChainById(token.chain);
  // 判断是否需要显示链图标（对于非原生代币，如 ETHUSDT）
  const showChainBadge = !token.isNative && token.chain !== token.token;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative flex items-center gap-2 min-w-[100px] h-11 px-3 rounded-lg',
        'border transition-all duration-200',
        'hover:bg-muted/50 active:scale-[0.98]',
        selected
          ? 'border-primary bg-primary/10 shadow-sm'
          : 'border-border bg-surface hover:border-muted-foreground/30',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {/* 选中状态指示器 */}
      {selected && (
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-3 h-3 text-primary-foreground" />
        </div>
      )}

      {/* 代币图标 */}
      <TokenIcon token={token.id} size={24} showChainBadge={showChainBadge} chainId={token.chain} />

      {/* 代币信息 */}
      <div className="flex flex-col items-start text-left">
        <span className="text-sm font-medium text-foreground">{token.token}</span>
        {token.type && (
          <span className="text-xs text-muted-foreground">{chain?.name || token.type}</span>
        )}
      </div>
    </button>
  );
};

export default CryptoTokenCard;
