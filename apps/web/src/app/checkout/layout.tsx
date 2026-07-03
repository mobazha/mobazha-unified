import type { Metadata } from 'next';
import React from 'react';
import { AuthGuard } from '@/components';
import { RuntimeCapabilityBoundary } from '@/components/RuntimeCapabilityBoundary';

export const metadata: Metadata = {
  title: 'Checkout — Mobazha',
  description: 'Complete your purchase on Mobazha decentralized marketplace.',
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <RuntimeCapabilityBoundary capability="commerce.checkout">
      <AuthGuard>{children}</AuthGuard>
    </RuntimeCapabilityBoundary>
  );
}
