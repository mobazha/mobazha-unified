'use client';

import { AiWorkspacePanel } from '@/components/admin/workspace';
import { useAdminDashboardData } from '@/hooks/useAdminDashboardData';
import { useReceivingAccounts } from '@mobazha/core';

export default function AIWorkspacePage() {
  const { profile, products, productsLoading, salesOrders, salesLoading } = useAdminDashboardData();

  const { data: receivingAccounts } = useReceivingAccounts();
  const hasProducts = products.length > 0;
  const hasNoPaymentMethods = !!(
    hasProducts &&
    receivingAccounts &&
    Array.isArray(receivingAccounts) &&
    receivingAccounts.filter(a => a.isActive !== false).length === 0
  );

  return (
    <AiWorkspacePanel
      orders={salesOrders}
      products={products}
      ordersLoading={salesLoading}
      productsLoading={productsLoading}
      hasNoPaymentMethods={hasNoPaymentMethods}
      isPrivateStore={profile?.visibility === 'private'}
    />
  );
}
