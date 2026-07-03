// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/**
 * Payment method capability projection shared by checkout policy and UI filters.
 *
 * Runtime capabilities are authoritative. The visibility constants document
 * the fail-closed defaults used by non-reactive consumers.
 */
import {
  supportsRuntimePaymentKind,
  supportsRuntimePaymentMethod,
  type RuntimeConfig,
} from './runtimeConfig';

export const PAYMENT_METHOD_VISIBILITY = {
  tron: false,
  fiat: false,
} as const;

export function isTronPaymentVisible(config?: RuntimeConfig): boolean {
  return supportsRuntimePaymentMethod('TRX', 'crypto', config);
}

export function isFiatPaymentVisible(config?: RuntimeConfig): boolean {
  return supportsRuntimePaymentKind('fiat', config);
}
