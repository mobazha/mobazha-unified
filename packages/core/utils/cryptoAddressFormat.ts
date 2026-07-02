/**
 * Lightweight synchronous crypto address format checks shared by scan parsing
 * and buyer refund preference validation.
 */

import { isAddress as isEthersAddress, getAddress } from 'ethers';

const ZERO_EVM_ADDRESS = '0x0000000000000000000000000000000000000000';
const SOLANA_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const TRON_ADDRESS_PATTERN = /^T[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{33}$/;

export function isEvmHexAddress(address: string): boolean {
  const trimmed = address.trim();
  if (!isEthersAddress(trimmed)) return false;
  try {
    return getAddress(trimmed) !== ZERO_EVM_ADDRESS;
  } catch {
    return false;
  }
}

export function isSolanaBase58Address(address: string): boolean {
  const trimmed = address.trim();
  return SOLANA_ADDRESS_PATTERN.test(trimmed);
}

export function isTronBase58Address(address: string): boolean {
  const trimmed = address.trim();
  return TRON_ADDRESS_PATTERN.test(trimmed);
}

/** Permissive UTXO-family length check (BTC/BCH/LTC/ZEC). */
export function isPermissiveUtxoAddress(address: string): boolean {
  const trimmed = address.trim();
  if (trimmed.length < 25 || trimmed.length > 90) return false;
  return !/\s/.test(trimmed);
}

export type PaymentAssetFamily = 'evm' | 'solana' | 'tron' | 'utxo' | 'unknown';

export function resolvePaymentAssetFamily(assetId: string): PaymentAssetFamily {
  if (assetId.startsWith('crypto:eip155:')) return 'evm';
  if (assetId.startsWith('crypto:solana:')) return 'solana';
  if (assetId.includes(':tron:') || assetId.endsWith(':trx:native')) return 'tron';
  if (assetId.startsWith('crypto:bip122:') || assetId === 'crypto:bitcoincash:mainnet:native') {
    return 'utxo';
  }
  return 'unknown';
}
