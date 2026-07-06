'use client';

import { OrdersSalesPanel } from '@/components/orders/OrdersSalesPanel';

/**
 * Keep the canonical Unified seller-orders experience while making anonymous
 * checkout the primary Sovereign view and removing the buyer-role switcher.
 */
export default function SovereignAdminOrdersPage() {
  return <OrdersSalesPanel shell="admin" defaultSource="guest" sovereignSellerOnly />;
}
