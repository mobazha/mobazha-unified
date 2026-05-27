'use client';

import { OrdersHub } from '@/components/orders/OrdersHub';

export default function OrdersPage() {
  return <OrdersHub shell="consumer" defaultRole="purchases" />;
}
