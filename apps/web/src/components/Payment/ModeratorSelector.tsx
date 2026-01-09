'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@mobazha/core';
import { ModeratorSelectorProps, Moderator } from './types';
import { ModeratorCard } from './ModeratorCard';
import { Input } from '@/components/ui/input';

// 默认 mock 仲裁员数据（当没有提供列表且 API 不可用时使用）
const DEFAULT_MOCK_MODERATORS: Moderator[] = [
  {
    id: 'mod1',
    peerID: 'QmMod1',
    name: 'TrustGuard',
    handle: 'trustguard',
    location: 'United States',
    verifiedMod: true,
    fee: {
      percentage: 1,
      feeType: 'percentage',
    },
    description:
      'Professional dispute resolution with 5+ years experience. Fast response within 24 hours.',
    languages: ['en', 'es'],
  },
  {
    id: 'mod2',
    peerID: 'QmMod2',
    name: 'SafeTrade',
    handle: 'safetrade',
    location: 'Germany',
    verifiedMod: true,
    fee: {
      percentage: 0.5,
      fixedFee: { amount: '5', currency: 'USD' },
      feeType: 'percentage_plus_fixed',
    },
    description: 'Multilingual moderator. Specializing in crypto and digital goods disputes.',
    languages: ['en', 'de', 'fr'],
  },
  {
    id: 'mod3',
    peerID: 'QmMod3',
    name: 'FairDeal',
    handle: 'fairdeal',
    location: 'Singapore',
    verifiedMod: false,
    fee: {
      fixedFee: { amount: '10', currency: 'USD' },
      feeType: 'fixed',
    },
    description: 'Asia-Pacific based moderator with 24/7 availability.',
    languages: ['en', 'zh', 'ja'],
  },
];

export const ModeratorSelector: React.FC<ModeratorSelectorProps> = ({
  selectedModerator,
  onSelect,
  disabled = false,
  className,
  moderatorList,
  isLoading = false,
}) => {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');

  // 使用提供的列表或默认 Mock 数据
  const moderators = moderatorList || DEFAULT_MOCK_MODERATORS;

  // 搜索过滤
  const filteredModerators = useMemo(() => {
    if (!searchQuery.trim()) {
      return moderators;
    }
    const query = searchQuery.toLowerCase();
    return moderators.filter(
      mod =>
        mod.name.toLowerCase().includes(query) ||
        mod.handle?.toLowerCase().includes(query) ||
        mod.location?.toLowerCase().includes(query) ||
        mod.description?.toLowerCase().includes(query)
    );
  }, [moderators, searchQuery]);

  // 处理选择
  const handleSelect = useCallback(
    (moderator: Moderator) => {
      if (disabled) return;
      onSelect(moderator);
    },
    [disabled, onSelect]
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t('payment.searchModerators', 'Search moderators...')}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9"
          disabled={disabled}
        />
      </div>

      {/* 仲裁员列表 */}
      <div className="space-y-3">
        {isLoading ? (
          // 加载状态
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="mt-2 text-sm text-muted-foreground">
              {t('payment.loadingModerators', 'Loading moderators...')}
            </span>
          </div>
        ) : filteredModerators.length > 0 ? (
          filteredModerators.map(moderator => (
            <ModeratorCard
              key={moderator.peerID}
              moderator={moderator}
              selected={selectedModerator?.peerID === moderator.peerID}
              onClick={() => handleSelect(moderator)}
              disabled={disabled}
            />
          ))
        ) : (
          // 空状态
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? (
              <span>{t('payment.noModeratorsFound', 'No moderators found')}</span>
            ) : (
              <span>{t('payment.noModeratorsAvailable', 'No moderators available')}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModeratorSelector;
