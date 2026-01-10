'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { useI18n, useVerifiedModerators } from '@mobazha/core';
import { cn } from '@/lib/utils';

export interface VerifiedModeratorBadgeProps {
  /** 商品的仲裁员 peerID 列表 */
  moderatorPeerIDs?: string[];
  /** 自定义样式 */
  className?: string;
  /** 是否显示完整描述（默认 true） */
  showDescription?: boolean;
}

/**
 * 认证仲裁员徽章组件
 *
 * 显示商品是否支持使用 Mobazha 认证仲裁员进行交易保护。
 *
 * @example
 * <VerifiedModeratorBadge moderatorPeerIDs={product.moderators} />
 */
export const VerifiedModeratorBadge = memo(function VerifiedModeratorBadge({
  moderatorPeerIDs,
  className,
  showDescription = true,
}: VerifiedModeratorBadgeProps) {
  const { t } = useI18n();
  const { hasVerifiedMod, isLoaded } = useVerifiedModerators();

  // 等待认证仲裁员列表加载完成
  if (!isLoaded) {
    return null;
  }

  // 检查是否有认证仲裁员
  const hasVerified = hasVerifiedMod(moderatorPeerIDs);

  if (!hasVerified) {
    return null;
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-emerald-200 dark:border-emerald-800',
        'bg-emerald-50 dark:bg-emerald-900/20',
        'p-3 sm:p-4',
        className
      )}
      data-testid="verified-moderator-badge"
    >
      <div className="flex items-start gap-3">
        {/* 图标 */}
        <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-100 dark:bg-emerald-800/50 flex items-center justify-center">
          <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
        </div>

        {/* 文字内容 */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm sm:text-base font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
            <span>{t('product.verifiedModerator')}</span>
          </h4>
          {showDescription && (
            <p className="text-xs sm:text-sm text-emerald-600/80 dark:text-emerald-400/80 mt-0.5 leading-relaxed">
              {t('product.verifiedModeratorDesc')}
            </p>
          )}
          <Link
            href="/moderators"
            className="inline-flex items-center gap-1 text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline mt-1.5 touch-feedback"
          >
            {t('product.learnMore')}
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
});

export default VerifiedModeratorBadge;
