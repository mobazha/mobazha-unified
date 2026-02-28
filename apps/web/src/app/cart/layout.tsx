import type { Metadata } from 'next';
import React from 'react';
import { AuthGuard } from '@/components';

export const metadata: Metadata = {
  title: 'Cart — Mobazha',
  description: 'Your shopping cart on Mobazha.',
  robots: { index: false, follow: false },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
