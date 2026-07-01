'use client';

import React, { Suspense, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header, MobilePageHeader } from '@/components';
import { Container } from '@/components/layouts';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { useI18n, useRoleStore } from '@mobazha/core';
import { useIsMobile } from '@/hooks/useMediaQuery';
import {
  parseOrderListRole,
  ordersListPath,
  type OrderListRole,
  type OrdersShell,
} from '@/lib/ordersNavigation';
import { OrdersRoleTabs } from './OrdersRoleTabs';
import { OrdersPurchasesPanel } from './OrdersPurchasesPanel';
import { OrdersSalesPanel } from './OrdersSalesPanel';

export interface OrdersHubProps {
  shell: OrdersShell;
  defaultRole: OrderListRole;
}

function OrdersHubFallback({ shell }: { shell: OrdersShell }) {
  return (
    <div className={shell === 'consumer' ? 'min-h-screen bg-background' : undefined}>
      {shell === 'consumer' && <Header />}
      <main className={shell === 'consumer' ? 'py-4 sm:py-8' : undefined}>
        <Container>
          <Skeleton variant="text" width="30%" height={32} />
          <Skeleton variant="rounded" width="100%" height={240} className="mt-6" />
        </Container>
      </main>
    </div>
  );
}

function OrdersHubContent({ shell, defaultRole }: OrdersHubProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const isSeller = useRoleStore(state => state.roleState.isSeller);

  const orderRole = useMemo(
    () => parseOrderListRole(searchParams, defaultRole),
    [searchParams, defaultRole]
  );

  const showRoleTabs = isSeller;

  const handleRoleChange = useCallback(
    (role: OrderListRole) => {
      router.push(ordersListPath(shell, role));
    },
    [router, shell]
  );

  const mobileTitle =
    orderRole === 'purchases'
      ? t('order.myPurchases')
      : shell === 'admin'
        ? t('admin.nav.storeSales')
        : t('order.mySales');

  const roleTabs = showRoleTabs ? (
    <div className={shell === 'admin' ? 'mb-4 sm:mb-6' : 'mb-3 sm:mb-6'}>
      <OrdersRoleTabs activeRole={orderRole} onRoleChange={handleRoleChange} shell={shell} />
    </div>
  ) : null;

  const panel =
    orderRole === 'purchases' ? (
      <OrdersPurchasesPanel shell={shell} />
    ) : (
      <OrdersSalesPanel shell={shell} />
    );

  if (shell === 'admin') {
    return (
      <div data-testid="orders-hub" data-shell="admin">
        {roleTabs}
        {panel}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="orders-hub" data-shell="consumer">
      <Header />
      <MobilePageHeader
        title={isMobile ? mobileTitle : t('nav.orders')}
        rootTab={orderRole === 'purchases'}
      />
      <main className="py-3 sm:py-8">
        <Container>
          <div className="hidden lg:block mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">{t('nav.orders')}</h1>
            <p className="text-base text-muted-foreground">{t('order.manageOrders')}</p>
          </div>
          <p className="lg:hidden text-xs text-muted-foreground mb-3">
            {orderRole === 'purchases' ? t('order.managePurchases') : t('order.manageOrders')}
          </p>
          {roleTabs}
          {panel}
        </Container>
      </main>
    </div>
  );
}

export function OrdersHub(props: OrdersHubProps) {
  return (
    <Suspense fallback={<OrdersHubFallback shell={props.shell} />}>
      <OrdersHubContent {...props} />
    </Suspense>
  );
}
