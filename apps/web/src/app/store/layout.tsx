'use client';

import type { ReactNode } from 'react';
import { RuntimeCapabilityBoundary } from '@/components/RuntimeCapabilityBoundary';

export default function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <RuntimeCapabilityBoundary capability="commerce.storefront">
      {children}
    </RuntimeCapabilityBoundary>
  );
}
