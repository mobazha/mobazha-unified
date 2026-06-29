/**
 * Payment method capability projection shared by checkout policy and UI filters.
 *
 * Runtime capabilities are authoritative. The legacy visibility object remains
 * exported for consumers that only need the conservative pre-bootstrap defaults.
 */
import {
  hasRuntimePaymentCapabilities,
  supportsRuntimePaymentKind,
  supportsRuntimePaymentMethod,
} from './runtimeConfig';

export const PAYMENT_METHOD_VISIBILITY = {
  tron: false,
  fiat: false,
} as const;

export function isTronPaymentVisible(): boolean {
  if (!hasRuntimePaymentCapabilities()) return PAYMENT_METHOD_VISIBILITY.tron;
  return supportsRuntimePaymentMethod('TRX', 'crypto');
}

export function isFiatPaymentVisible(): boolean {
  return supportsRuntimePaymentKind('fiat', PAYMENT_METHOD_VISIBILITY.fiat);
}
