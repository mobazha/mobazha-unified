'use client';

import { Suspense } from 'react';
import { useBreakpoint } from '@mobazha/ui/hooks';
import { CartMobile, CartDesktop } from '@/components/Cart';

function CartLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function CartSwitch() {
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return <CartMobile />;
  }
  return <CartDesktop />;
}

export default function CartPage() {
  return (
    <Suspense fallback={<CartLoading />}>
      <CartSwitch />
    </Suspense>
  );
}
