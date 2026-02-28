import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Search — Mobazha',
  description: 'Search products and stores on Mobazha decentralized marketplace.',
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
