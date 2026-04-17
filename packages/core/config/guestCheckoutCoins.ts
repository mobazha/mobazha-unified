/**
 * Guest Checkout supported coins — derived from tokens.ts (CHAINS + TOKENS),
 * filtered by backend KeyDeriver capability (node_key_deriver.go chainToBIP44CoinType).
 *
 * SOL is intentionally excluded: Solana guest checkout requires a
 * reference-key mechanism that is not yet implemented.
 *
 * CFX is excluded: not supported by KeyDeriver.
 */

import { CHAINS, TOKENS, type PaymentChainConfig, type TokenConfig } from '../data/tokens';

/**
 * Chain IDs (as used in CHAINS / PaymentChainConfig) supported by Guest Checkout KeyDeriver.
 * Order determines UI display order.
 */
const GUEST_SUPPORTED_CHAIN_IDS = [
  'BTC', 'ETH', 'LTC', 'BCH', 'ZEC', 'BSC', 'MATIC', 'BASE', 'TRON',
] as const;

/**
 * Map CHAINS.id → iwallet.ChainType (the `paymentCoin` value sent to backend API).
 * Only entries where they differ need to be listed.
 */
const CHAIN_ID_TO_PAYMENT_COIN: Record<string, string> = {
  TRON: 'TRX',
};

export interface GuestCoinInfo {
  chainId: string;
  paymentCoin: string;
  chain: PaymentChainConfig;
  nativeToken: TokenConfig | undefined;
}

export const GUEST_CHECKOUT_COINS: GuestCoinInfo[] = GUEST_SUPPORTED_CHAIN_IDS
  .map((chainId): GuestCoinInfo | null => {
    const chain = CHAINS.find((c) => c.id === chainId);
    if (!chain) return null;
    const nativeToken = TOKENS.find((t) => t.chain === chainId && t.isNative);
    return {
      chainId: chainId as string,
      paymentCoin: CHAIN_ID_TO_PAYMENT_COIN[chainId] ?? chainId,
      chain,
      nativeToken,
    };
  })
  .filter((c): c is GuestCoinInfo => c !== null);

export const GUEST_CHECKOUT_DEFAULT_COINS = ['BTC', 'ETH', 'LTC'];

export function getGuestCoinByPaymentCoin(paymentCoin: string): GuestCoinInfo | undefined {
  return GUEST_CHECKOUT_COINS.find((c) => c.paymentCoin === paymentCoin);
}

export function getGuestCoinByChainId(chainId: string): GuestCoinInfo | undefined {
  return GUEST_CHECKOUT_COINS.find((c) => c.chainId === chainId);
}
