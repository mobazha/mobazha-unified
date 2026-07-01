'use client';

import type { ReactNode } from 'react';
import { RuntimeCapabilityBoundary } from '@/components/RuntimeCapabilityBoundary';

export default function GuestCheckoutLayout({ children }: { children: ReactNode }) {
  return (
    <RuntimeCapabilityBoundary capability="commerce.checkout">{children}</RuntimeCapabilityBoundary>
  );
}
