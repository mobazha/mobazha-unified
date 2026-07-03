'use client';

import { OrdersHub } from '@/components/orders/OrdersHub';

export default function AdminOrdersPage() {
  return <OrdersHub shell="admin" defaultRole="sales" />;
}
