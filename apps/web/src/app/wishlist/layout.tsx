import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Wishlist — Mobazha',
  description: 'Your saved products on Mobazha decentralized marketplace.',
  robots: { index: false, follow: false },
};

export default function WishlistLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
