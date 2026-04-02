import type { OrderListItem, ProductListItem } from '@mobazha/core';
import { getPaymentCoinDisplayLabel } from '@mobazha/core/data/tokens';

export function getOrderCurrencyCode(order: OrderListItem): string {
  const total = order.total as unknown as Record<string, unknown> | undefined;
  const raw =
    (total?.currencyCode as string) ||
    (total?.currency as Record<string, string>)?.code ||
    order.coinType ||
    'USD';
  return getPaymentCoinDisplayLabel(raw) || raw;
}

export function getProductCurrencyCode(product: ProductListItem): string {
  const price = product.price as unknown as Record<string, unknown> | undefined;
  return (
    (price?.currencyCode as string) || (price?.currency as Record<string, string>)?.code || 'USD'
  );
}
