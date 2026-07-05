import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('@mobazha/core', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'dealPromotion.attributionBannerBody') {
        return `commission ${params?.commission} ${params?.currency}`;
      }
      if (key === 'dealPromotion.attributionWindowDays') {
        return `window ${params?.count}`;
      }
      const translations: Record<string, string> = {
        'dealPromotion.attributionBannerTitle': 'Referred offer',
        'dealPromotion.manualReviewOnlyNotice': 'Manual review only',
      };
      return translations[key] ?? key;
    },
  }),
  formatAttributionWindowDays: (seconds: number) => Math.round(seconds / 86400),
  formatCommissionRateFromBPS: (bps: number) => String(bps / 100),
}));

import { DealLinkAttributionBanner } from '@/components/DealLink/DealLinkAttributionBanner';

describe('DealLinkAttributionBanner', () => {
  it('renders manual-review attribution disclosure', () => {
    render(
      <DealLinkAttributionBanner
        claim={{
          claimToken: 'claim-token',
          expiresAt: '2099-01-01T00:00:00Z',
          dealToken: 'deal-token',
          dealLinkID: 'deal-1',
          dealRevision: 1,
          termsHash: 'hash',
          programPolicyVersion: 'single-level-direct-v1',
          commissionRateBPS: 500,
          calculationBase: 'gross_order_amount',
          currency: 'USD',
          settlementMode: 'manual_review_only',
          attributionWindowSeconds: 604800,
        }}
      />
    );

    expect(screen.getByTestId('deal-link-attribution-banner')).toBeInTheDocument();
    expect(screen.getByText('Referred offer')).toBeInTheDocument();
    expect(screen.getByText('commission 5 USD')).toBeInTheDocument();
    expect(screen.getByText('window 7')).toBeInTheDocument();
    expect(screen.getByText('Manual review only')).toBeInTheDocument();
  });
});
