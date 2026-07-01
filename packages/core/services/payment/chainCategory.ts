// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { isCanonicalPaymentCoin, parseCanonicalPaymentCoin } from '../../data/tokens';

/** Broad chain family used to select payment presentation and address handling. */
export type ChainCategory = 'evm' | 'solana' | 'utxo' | 'tron';

/**
 * Resolve a canonical payment coin identifier to its broad chain family.
 *
 * This is classification only. Payment execution and settlement remain owned
 * by the backend; browser clients use the result for payment presentation.
 */
export function resolveChainCategory(coin: string): ChainCategory | null {
  const trimmed = coin.trim();
  if (!trimmed || !isCanonicalPaymentCoin(trimmed)) {
    return null;
  }

  const parsed = parseCanonicalPaymentCoin(trimmed);
  if (!parsed) {
    return null;
  }

  switch (parsed.namespace) {
    case 'bip122':
    case 'bitcoincash':
    case 'zcash':
      return 'utxo';
    case 'eip155':
      return 'evm';
    case 'solana':
      return 'solana';
    case 'tron':
      return 'tron';
    default:
      return null;
  }
}
