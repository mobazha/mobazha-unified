'use client';

import React, { memo, useMemo } from 'react';
import { useI18n, type DisplayFiatDispute } from '@mobazha/core';

const PROVIDER_DASHBOARD: Record<string, string> = {
  stripe: 'https://dashboard.stripe.com/disputes',
  paypal: 'https://www.paypal.com/resolutioncenter',
};

export interface FiatDisputeBannerProps {
  fiatDispute: DisplayFiatDispute;
  userRole: 'buyer' | 'seller' | 'moderator';
  className?: string;
}

export const FiatDisputeBanner = memo(function FiatDisputeBanner({
  fiatDispute,
  userRole,
  className,
}: FiatDisputeBannerProps) {
  const { t } = useI18n();
  const isResolved = fiatDispute.status === 'resolved';
  const providerLabel = fiatDispute.provider === 'stripe' ? 'Stripe' : 'PayPal';

  const dashboardUrl = useMemo(
    () => PROVIDER_DASHBOARD[fiatDispute.provider] || PROVIDER_DASHBOARD.stripe,
    [fiatDispute.provider]
  );

  const outcomeMessage = useMemo(() => {
    if (!isResolved || !fiatDispute.outcome) return null;
    switch (fiatDispute.outcome) {
      case 'won':
        return t('order.fiatDispute.outcomeWon');
      case 'lost':
        return t('order.fiatDispute.outcomeLost');
      case 'accepted':
        return t('order.fiatDispute.outcomeAccepted');
      default:
        return null;
    }
  }, [isResolved, fiatDispute.outcome, t]);

  const bgClass = isResolved
    ? 'bg-muted border-border'
    : 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/50';
  const titleClass = isResolved ? 'text-muted-foreground' : 'text-amber-800 dark:text-amber-200';
  const textClass = isResolved ? 'text-muted-foreground' : 'text-amber-700 dark:text-amber-300';

  return (
    <div className={className}>
      <div className={`p-3 sm:p-4 border rounded-lg mb-4 ${bgClass}`}>
        <div className="flex items-start gap-2.5">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
              isResolved ? 'bg-muted' : 'bg-amber-100 dark:bg-amber-900/50'
            }`}
          >
            <svg
              className={`w-3.5 h-3.5 ${isResolved ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-sm sm:text-base ${titleClass}`}>
              {isResolved ? t('order.fiatDispute.titleResolved') : t('order.fiatDispute.title')}
            </h3>
            <p className={`text-xs sm:text-sm mt-0.5 ${textClass}`}>
              {isResolved
                ? t('order.fiatDispute.descriptionResolved')
                : t('order.fiatDispute.description', { provider: providerLabel })}
            </p>
            {fiatDispute.reason && !isResolved && (
              <p className={`text-xs mt-0.5 ${textClass}`}>
                {t('order.fiatDispute.reason', { reason: fiatDispute.reason })}
              </p>
            )}
            {outcomeMessage && (
              <p className={`text-xs mt-1 font-medium ${textClass}`}>{outcomeMessage}</p>
            )}
            {!isResolved && (
              <p className={`text-xs mt-1.5 ${textClass} opacity-80`}>
                {userRole === 'seller'
                  ? t('order.fiatDispute.sellerHint')
                  : t('order.fiatDispute.buyerHint')}
              </p>
            )}
            {userRole === 'seller' && !isResolved && (
              <a
                href={dashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 text-xs underline mt-2 ${textClass} hover:opacity-70 transition-opacity`}
              >
                {t('order.fiatDispute.viewDashboard', { provider: providerLabel })}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
