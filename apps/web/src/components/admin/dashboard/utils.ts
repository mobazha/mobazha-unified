import type { OrderListItem, ProductListItem } from '@mobazha/core';

export function getOrderCurrencyCode(order: OrderListItem): string {
  const total = order.total as Record<string, unknown> | undefined;
  return (
    (total?.currencyCode as string) ||
    (total?.currency as Record<string, string>)?.code ||
    order.coinType ||
    'USD'
  );
}

export function getProductCurrencyCode(product: ProductListItem): string {
  const price = product.price as Record<string, unknown> | undefined;
  return (
    (price?.currencyCode as string) || (price?.currency as Record<string, string>)?.code || 'USD'
  );
}
