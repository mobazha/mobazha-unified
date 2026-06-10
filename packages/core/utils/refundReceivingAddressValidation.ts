/**
 * Client-side validation for buyer default refund receiving addresses.
 * Mirrors backend permissiveness in mobazha3.0/pkg/paymentaddress.
 */

import {
  isEvmHexAddress,
  isMoneroAddress,
  isPermissiveUtxoAddress,
  isSolanaBase58Address,
  isTronBase58Address,
  resolvePaymentAssetFamily,
} from './cryptoAddressFormat';

export type RefundAddressValidationResult =
  | { valid: true }
  | { valid: false; code: 'empty' | 'format' | 'zero_address' };

export type RefundAddressWarning =
  | { type: 'duplicate_other_coin'; otherCoin: string }
  | { type: 'bch_bech32_mismatch' };

/** Synchronous format check before hitting /v1/preferences. */
export function validateRefundReceivingAddressInput(
  assetId: string,
  address: string
): RefundAddressValidationResult {
  const trimmed = address.trim();
  if (!trimmed) {
    return { valid: false, code: 'empty' };
  }

  switch (resolvePaymentAssetFamily(assetId)) {
    case 'evm':
      if (!isEvmHexAddress(trimmed)) {
        return trimmed.toLowerCase() === '0x0000000000000000000000000000000000000000'
          ? { valid: false, code: 'zero_address' }
          : { valid: false, code: 'format' };
      }
      return { valid: true };
    case 'solana':
      return isSolanaBase58Address(trimmed) ? { valid: true } : { valid: false, code: 'format' };
    case 'tron':
      return isTronBase58Address(trimmed) ? { valid: true } : { valid: false, code: 'format' };
    case 'monero':
      return isMoneroAddress(trimmed) ? { valid: true } : { valid: false, code: 'format' };
    case 'utxo':
      return isPermissiveUtxoAddress(trimmed) ? { valid: true } : { valid: false, code: 'format' };
    default:
      if (trimmed.length < 10 || trimmed.length > 120 || /\s/.test(trimmed)) {
        return { valid: false, code: 'format' };
      }
      return { valid: true };
  }
}

/** Non-blocking warnings for cross-coin reuse or risky formats. */
export function getRefundReceivingAddressWarnings(
  assetId: string,
  address: string,
  existing: Record<string, string>
): RefundAddressWarning[] {
  const trimmed = address.trim();
  if (!trimmed) return [];

  const warnings: RefundAddressWarning[] = [];

  for (const [coin, existingAddr] of Object.entries(existing)) {
    if (coin === assetId) continue;
    if (existingAddr.trim().toLowerCase() === trimmed.toLowerCase()) {
      warnings.push({ type: 'duplicate_other_coin', otherCoin: coin });
    }
  }

  if (
    assetId === 'crypto:bitcoincash:mainnet:native' &&
    (trimmed.startsWith('bc1') ||
      trimmed.startsWith('tb1') ||
      trimmed.startsWith('1') ||
      trimmed.startsWith('3'))
  ) {
    warnings.push({ type: 'bch_bech32_mismatch' });
  }

  return warnings;
}
