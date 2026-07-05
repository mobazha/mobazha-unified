'use client';

import React from 'react';
import { Info } from 'lucide-react';
import { formatAttributionWindowDays, formatCommissionRateFromBPS, useI18n } from '@mobazha/core';
import type { StoredDealAttributionClaim } from '@mobazha/core';
import { Card, CardContent } from '@/components/ui/card';

interface DealLinkAttributionBannerProps {
  claim: StoredDealAttributionClaim;
}

export function DealLinkAttributionBanner({ claim }: DealLinkAttributionBannerProps) {
  const { t } = useI18n();
  const windowDays = claim.attributionWindowSeconds
    ? formatAttributionWindowDays(claim.attributionWindowSeconds)
    : undefined;
  const commissionPercent = formatCommissionRateFromBPS(claim.commissionRateBPS);

  return (
    <Card
      className="border-primary/20 bg-primary/5"
      data-testid="deal-link-attribution-banner"
      role="note"
      aria-labelledby="deal-link-attribution-heading"
    >
      <CardContent className="space-y-2 p-4 text-sm leading-6">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <div className="space-y-2">
            <p id="deal-link-attribution-heading" className="font-medium">
              {t('dealPromotion.attributionBannerTitle')}
            </p>
            <p className="text-muted-foreground">
              {t('dealPromotion.attributionBannerBody', {
                commission: commissionPercent,
                currency: claim.currency,
              })}
            </p>
            <p className="text-muted-foreground">
              {windowDays
                ? t('dealPromotion.attributionWindowDays', { count: windowDays })
                : t('dealPromotion.attributionWindowUnknown')}
            </p>
            <p className="text-muted-foreground">{t('dealPromotion.manualReviewOnlyNotice')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
