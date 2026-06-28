/**
 * Guest Checkout supported coins — Community Edition UTXO allowlist only.
 *
 * Backend KeyDeriver at the 2026-04-23 anchor supports BTC/BCH/LTC/ZEC for guest checkout.
 * EVM/Solana/TRON guest checkout is excluded from Community Edition runtime.
 */

import { COMMUNITY_PAYMENT_CHAINS } from '../edition/manifest';
import { CHAINS, TOKENS, type PaymentChainConfig, type TokenConfig } from '../data/tokens';

const CHAIN_ID_TO_PAYMENT_COIN: Record<string, string> = {};

export interface GuestCoinInfo {
  chainId: string;
  paymentCoin: string;
  chain: PaymentChainConfig;
  nativeToken: TokenConfig | undefined;
}

export const GUEST_CHECKOUT_COINS: GuestCoinInfo[] = COMMUNITY_PAYMENT_CHAINS.map(
  (chainId): GuestCoinInfo | null => {
    const chain = CHAINS.find(c => c.id === chainId);
    if (!chain) return null;
    const nativeToken = TOKENS.find(t => t.chain === chainId && t.isNative);
    return {
      chainId,
      paymentCoin: CHAIN_ID_TO_PAYMENT_COIN[chainId] ?? chainId,
      chain,
      nativeToken,
    };
  }
).filter((c): c is GuestCoinInfo => c !== null);

export const GUEST_CHECKOUT_DEFAULT_COINS = ['BTC', 'LTC', 'BCH'];

export function getGuestCoinByPaymentCoin(paymentCoin: string): GuestCoinInfo | undefined {
  return GUEST_CHECKOUT_COINS.find(c => c.paymentCoin === paymentCoin);
}

export function getGuestCoinByChainId(chainId: string): GuestCoinInfo | undefined {
  return GUEST_CHECKOUT_COINS.find(c => c.chainId === chainId);
}
