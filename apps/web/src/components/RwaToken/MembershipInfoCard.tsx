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
 * 使用主题感知颜色（primary），适配所有主题和 dark mode
 */
export function MembershipInfoCard({
  membership,
  className = '',
  compact = false,
}: MembershipInfoCardProps) {
  const { t } = useI18n();

  if (compact) {
    return (
      <div className={cn('p-3 bg-primary/8 rounded-lg border border-primary/20', className)}>
        <div className="flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2 text-primary">
            <Users className="w-4 h-4" />
            <span className="font-medium">{membership.level}</span>
          </div>
          <div className="flex items-center gap-3 text-foreground/70 font-medium">
            <span>
              {membership.holderCount} {t('listing.rwa.holders')}
            </span>
            <span>
              {membership.exclusivePerks} {t('listing.rwa.exclusivePerks')}
            </span>
            <span>{membership.validityType}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('p-4 bg-primary/8 rounded-lg border border-primary/20', className)}>
      <h5 className="font-medium text-primary mb-3 flex items-center gap-2">
        <Users className="w-4 h-4" />
        {t('listing.rwa.membershipInfo')}
      </h5>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="text-center p-2 bg-background/80 rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">{t('listing.rwa.memberLevel')}</div>
          <div className="font-semibold text-primary">{membership.level}</div>
        </div>
        <div className="text-center p-2 bg-background/80 rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">
            {t('listing.rwa.currentHolders')}
          </div>
          <div className="font-semibold text-primary">{membership.holderCount}</div>
        </div>
        <div className="text-center p-2 bg-background/80 rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">
            {t('listing.rwa.exclusivePerks')}
          </div>
          <div className="font-semibold text-primary">{membership.exclusivePerks}</div>
        </div>
        <div className="text-center p-2 bg-background/80 rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">{t('listing.rwa.validity')}</div>
          <div className="font-semibold text-primary">{membership.validityType}</div>
        </div>
      </div>
    </div>
  );
}

export default MembershipInfoCard;
