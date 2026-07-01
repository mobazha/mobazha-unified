import { getShippedStatusLabelKey } from '@mobazha/core';
import { getStandardStatusConfig, resolveStatusDisplay } from '../orderStatusConfig';

type TranslateFn = (key: string) => string;

const RAW_STATE_TO_DISPLAY: Record<string, string> = {
  AWAITING_PAYMENT: 'awaiting_payment',
  AWAITING_PAYMENT_VERIFICATION: 'pending',
  PENDING: 'pending',
  AWAITING_PICKUP: 'processing',
  AWAITING_SHIPMENT: 'processing',
  PARTIALLY_SHIPPED: 'processing',
  SHIPPED: 'shipped',
  COMPLETED: 'completed',
  CANCELED: 'cancelled',
  CANCELLED: 'cancelled',
  DECLINED: 'declined',
  REFUNDED: 'refunded',
  DISPUTED: 'disputed',
  DECIDED: 'decided',
  RESOLVED: 'completed',
  PAYMENT_FINALIZED: 'finalized',
  PROCESSING_ERROR: 'error',
};

/** Normalize API/Matrix order state to display-order status slug. */
export function normalizeOrderDisplayStatus(status: string): string {
  const trimmed = status.trim();
  return RAW_STATE_TO_DISPLAY[trimmed] ?? trimmed.toLowerCase();
}

/**
 * Compute human-readable status label from order status.
 */
export function getStatusLabel(status: string, t: TranslateFn, contractType?: string): string {
  const normalized = normalizeOrderDisplayStatus(status);
  if (normalized === 'shipped') {
    return t(getShippedStatusLabelKey(contractType));
  }
  const config = getStandardStatusConfig(t);
  return resolveStatusDisplay(normalized, config).label;
}
