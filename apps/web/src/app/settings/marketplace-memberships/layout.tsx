'use client';

import type { ReactNode } from 'react';
import { RuntimeCapabilityBoundary } from '@/components/RuntimeCapabilityBoundary';

export default function MarketplaceMembershipsLayout({ children }: { children: ReactNode }) {
  return (
    <RuntimeCapabilityBoundary capability="marketplace.sellerReview">
      {children}
    </RuntimeCapabilityBoundary>
  );
}
