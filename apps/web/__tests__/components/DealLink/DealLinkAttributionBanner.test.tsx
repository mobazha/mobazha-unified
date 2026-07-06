// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('@mobazha/core', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'dealPromotion.attributionBannerTitle': 'You arrived through a partner link',
        'dealPromotion.attributionBannerBody':
          'Your price stays the same. Any partner reward is handled after order review.',
      };
      return translations[key] ?? key;
    },
  }),
}));

import { DealLinkAttributionBanner } from '@/components/DealLink/DealLinkAttributionBanner';

describe('DealLinkAttributionBanner', () => {
  it('explains partner attribution without exposing commission mechanics to the buyer', () => {
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
    expect(screen.getByText('You arrived through a partner link')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Your price stays the same. Any partner reward is handled after order review.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/5|USD|window|manual review/i)).not.toBeInTheDocument();
  });
});
