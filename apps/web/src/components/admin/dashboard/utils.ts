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

export function getProductCurrencyCode(product: ProductListItem): string | undefined {
  const price = product.price as unknown as Record<string, unknown> | undefined;
  const code =
    (price?.currencyCode as string | undefined) ||
    (price?.currency as Record<string, string> | undefined)?.code;
  const trimmed = code?.trim();
  return trimmed || undefined;
}
