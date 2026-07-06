'use client';

import type { DisplayFiatDispute } from '@mobazha/core';

export interface FiatDisputeBannerProps {
  fiatDispute: DisplayFiatDispute;
  userRole: 'buyer' | 'seller' | 'moderator';
  className?: string;
}

/** Fiat provider disputes do not exist in a Sovereign XMR-only distribution. */
export function FiatDisputeBanner(_props: FiatDisputeBannerProps) {
  return null;
}
