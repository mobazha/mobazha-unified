'use client';

import type { ReactNode } from 'react';
import { RuntimeCapabilityBoundary } from '@/components/RuntimeCapabilityBoundary';

export default function MarketplaceLayout({ children }: { children: ReactNode }) {
  return (
    <RuntimeCapabilityBoundary capability="marketplace.discovery">
      {children}
    </RuntimeCapabilityBoundary>
  );
}
