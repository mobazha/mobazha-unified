'use client';

import React from 'react';
import type { TokenStandard } from '@mobazha/core';
import { getTokenStandardColor, getTokenStandardDisplayName } from '@mobazha/core';
import { cn } from '@/lib/utils';

export interface RwaAssetBadgeProps {
  tokenStandard: TokenStandard;
  typeName?: string;
  emoji?: string;
  blockchain?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * RWA 资产徽章
 * 显示 Token 标准、资产类型和区块链网络
 */
export function RwaAssetBadge({
  tokenStandard,
  typeName,
  emoji,
  blockchain,
  className = '',
  size = 'md',
}: RwaAssetBadgeProps) {
  const color = getTokenStandardColor(tokenStandard);
  const displayName = typeName || getTokenStandardDisplayName(tokenStandard);
  const networkName = blockchain ? blockchain.charAt(0).toUpperCase() + blockchain.slice(1) : '';

  const sizeClasses = {
    sm: 'text-xs py-0.5 px-2',
    md: 'text-sm py-1 px-3',
    lg: 'text-base py-1.5 px-4',
  };

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {/* 资产类型徽章 */}
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full font-medium',
          sizeClasses[size]
        )}
        style={{
          backgroundColor: `${color}20`,
          color: color,
          border: `1px solid ${color}40`,
        }}
      >
        {emoji && <span>{emoji}</span>}
        <span>{displayName}</span>
      </span>

      {/* Token 标准徽章 */}
      <span
        className={cn(
          'inline-flex items-center rounded font-mono',
          size === 'sm' ? 'text-[10px] py-0.5 px-1.5' : 'text-xs py-0.5 px-2',
          'bg-muted text-muted-foreground'
        )}
      >
        {tokenStandard}
      </span>

      {/* 区块链网络 */}
      {networkName && (
        <span
          className={cn(
            'inline-flex items-center',
            size === 'sm' ? 'text-[10px]' : 'text-xs',
            'text-muted-foreground'
          )}
        >
          · {networkName}
        </span>
      )}
    </div>
  );
}

export default RwaAssetBadge;
