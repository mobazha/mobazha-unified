'use client';

import React from 'react';
import { DealLinksProvider } from '@/components/admin/deal-links/DealLinksContext';

export default function AdminDealLinksLayout({ children }: { children: React.ReactNode }) {
  return <DealLinksProvider>{children}</DealLinksProvider>;
}
