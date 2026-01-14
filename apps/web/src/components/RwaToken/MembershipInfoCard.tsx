'use client';

import React from 'react';
import { Users } from 'lucide-react';
import type { MembershipInfo } from '@mobazha/core';
import { useI18n } from '@mobazha/core';
import { cn } from '@/lib/utils';

export interface MembershipInfoCardProps {
  membership: MembershipInfo;
  className?: string;
  compact?: boolean;
}

/**
 * 会员信息卡片 (ERC1155)
 * 展示会员等级、持有人数、专属福利、有效期等信息
 */
export function MembershipInfoCard({
  membership,
  className = '',
  compact = false,
}: MembershipInfoCardProps) {
  const { t } = useI18n();

  if (compact) {
    return (
      <div
        className={cn(
          'p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800',
          className
        )}
      >
        <div className="flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
            <Users className="w-4 h-4" />
            <span className="font-medium">{membership.level}</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <span>{membership.holderCount} 人</span>
            <span>{membership.exclusivePerks} 项福利</span>
            <span>{membership.validityType}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800',
        className
      )}
    >
      <h5 className="font-medium text-indigo-700 dark:text-indigo-400 mb-3 flex items-center gap-2">
        <Users className="w-4 h-4" />
        {t('listing.rwa.membershipInfo') || '会员信息'}
      </h5>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="text-center p-2 bg-white dark:bg-indigo-900/30 rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">
            {t('listing.rwa.memberLevel') || '会员等级'}
          </div>
          <div className="font-semibold text-indigo-700 dark:text-indigo-400">
            {membership.level}
          </div>
        </div>
        <div className="text-center p-2 bg-white dark:bg-indigo-900/30 rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">
            {t('listing.rwa.currentHolders') || '当前持有'}
          </div>
          <div className="font-semibold text-indigo-700 dark:text-indigo-400">
            {membership.holderCount} 人
          </div>
        </div>
        <div className="text-center p-2 bg-white dark:bg-indigo-900/30 rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">
            {t('listing.rwa.exclusivePerks') || '专属福利'}
          </div>
          <div className="font-semibold text-indigo-700 dark:text-indigo-400">
            {membership.exclusivePerks} 项
          </div>
        </div>
        <div className="text-center p-2 bg-white dark:bg-indigo-900/30 rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">
            {t('listing.rwa.validity') || '有效期'}
          </div>
          <div className="font-semibold text-indigo-700 dark:text-indigo-400">
            {membership.validityType}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MembershipInfoCard;
