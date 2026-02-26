'use client';

import React from 'react';
import { Separator } from '@/components/ui/separator';
import { RadioOption } from '@/components/ui/radio-option';
import { useI18n } from '@mobazha/core';
import { cn } from '@/lib/utils';

// 代币标准筛选类型
export type TokenStandardFilter = 'all' | 'ERC721' | 'ERC1155' | 'ERC3525';

// 交易模式筛选类型
export type TradeModeFilter = 'all' | 'instant' | 'confirm_required';

// RWA 筛选状态
export interface RwaFilterState {
  search: string;
  tokenStandard: TokenStandardFilter;
  tradeMode: TradeModeFilter;
  sortBy: 'newest' | 'price-asc' | 'price-desc';
}

// 默认筛选状态
export const defaultRwaFilterState: RwaFilterState = {
  search: '',
  tokenStandard: 'all',
  tradeMode: 'all',
  sortBy: 'newest',
};

interface RwaFilterSidebarProps {
  filter: RwaFilterState;
  onFilterChange: (filter: RwaFilterState) => void;
  tokenStandardCounts?: { ERC721: number; ERC1155: number; ERC3525: number };
  className?: string;
}

// 代币标准徽章
const TokenBadge: React.FC<{ standard: string; className?: string }> = ({
  standard,
  className,
}) => {
  const colors: Record<string, string> = {
    ERC721: 'bg-primary',
    ERC1155: 'bg-info',
    ERC3525: 'bg-success',
  };

  return (
    <span
      className={cn(
        'text-white text-xs px-1.5 py-0.5 rounded font-medium',
        colors[standard] || 'bg-muted',
        className
      )}
    >
      {standard}
    </span>
  );
};

/**
 * RWA 数字资产筛选侧边栏
 * 与商品标签页的 FilterSidebar 保持一致的布局风格
 */
export const RwaFilterSidebar: React.FC<RwaFilterSidebarProps> = ({
  filter,
  onFilterChange,
  tokenStandardCounts = { ERC721: 0, ERC1155: 0, ERC3525: 0 },
  className,
}) => {
  const { t } = useI18n();

  const updateFilter = (updates: Partial<RwaFilterState>) => {
    onFilterChange({ ...filter, ...updates });
  };

  const totalCount =
    tokenStandardCounts.ERC721 + tokenStandardCounts.ERC1155 + tokenStandardCounts.ERC3525;

  return (
    <aside className={cn('w-56 shrink-0 space-y-5', className)}>
      {/* 代币标准 - Token Standard */}
      <div className="space-y-2">
        <h3 className="text-sm lg:text-base font-semibold text-foreground">
          {t('rwa.filterTokenStandard')}
        </h3>
        <div className="space-y-0.5">
          <RadioOption
            label={`${t('filter.allTypes')} (${totalCount})`}
            selected={filter.tokenStandard === 'all'}
            onClick={() => updateFilter({ tokenStandard: 'all' })}
          />
          <RadioOption
            label={`NFT (${tokenStandardCounts.ERC721})`}
            selected={filter.tokenStandard === 'ERC721'}
            onClick={() => updateFilter({ tokenStandard: 'ERC721' })}
            badge={<TokenBadge standard="ERC721" />}
          />
          <RadioOption
            label={`${t('rwa.membership')} (${tokenStandardCounts.ERC1155})`}
            selected={filter.tokenStandard === 'ERC1155'}
            onClick={() => updateFilter({ tokenStandard: 'ERC1155' })}
            badge={<TokenBadge standard="ERC1155" />}
          />
          <RadioOption
            label={`${t('rwa.share')} (${tokenStandardCounts.ERC3525})`}
            selected={filter.tokenStandard === 'ERC3525'}
            onClick={() => updateFilter({ tokenStandard: 'ERC3525' })}
            badge={<TokenBadge standard="ERC3525" />}
          />
        </div>
      </div>

      <Separator />

      {/* 交易模式 - Trade Mode */}
      <div className="space-y-2">
        <h3 className="text-sm lg:text-base font-semibold text-foreground">
          {t('rwa.filterTradeMode')}
        </h3>
        <div className="space-y-0.5">
          <RadioOption
            label={t('filter.allTypes')}
            selected={filter.tradeMode === 'all'}
            onClick={() => updateFilter({ tradeMode: 'all' })}
          />
          <RadioOption
            label={t('rwa.instantTrade')}
            selected={filter.tradeMode === 'instant'}
            onClick={() => updateFilter({ tradeMode: 'instant' })}
            badge={<span className="text-warning">⚡</span>}
          />
          <RadioOption
            label={t('rwa.confirmRequired')}
            selected={filter.tradeMode === 'confirm_required'}
            onClick={() => updateFilter({ tradeMode: 'confirm_required' })}
            badge={<span className="text-info">🔒</span>}
          />
        </div>
      </div>
    </aside>
  );
};

export default RwaFilterSidebar;
