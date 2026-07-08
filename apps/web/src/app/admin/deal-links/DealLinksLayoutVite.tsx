'use client';

import { Outlet } from 'react-router-dom';
import { DealLinksProvider } from '@/components/admin/deal-links/DealLinksContext';

/** React Router shell — keeps DealLinksProvider mounted across /deal-links/* routes. */
export default function DealLinksLayoutVite() {
  return (
    <DealLinksProvider>
      <Outlet />
    </DealLinksProvider>
  );
}
