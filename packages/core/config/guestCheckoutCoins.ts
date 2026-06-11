/**
 * Guest Checkout supported coins — derived from tokens.ts (CHAINS + TOKENS),
 * filtered by backend KeyDeriver capability (node_key_deriver.go chainToBIP44CoinType).
 *
 * SOL is intentionally excluded: Solana guest checkout requires a
 * reference-key mechanism that is not yet implemented.
 *
 * CFX is excluded: not supported by KeyDeriver.
 */

import {
  CHAINS,
  TOKENS,
  isPaymentCoinEnabled,
  type PaymentChainConfig,
  type TokenConfig,
} from '../data/tokens';
import { isTronPaymentVisible } from './paymentMethodVisibility';

/**
 * Chain IDs (as used in CHAINS / PaymentChainConfig) supported by Guest Checkout KeyDeriver.
 * Order determines UI display order.
 */
const GUEST_SUPPORTED_CHAIN_IDS = [
  'BTC',
  'ETH',
  'LTC',
  'BCH',
  'XMR',
  'BSC',
  'MATIC',
  'BASE',
  ...(isTronPaymentVisible() ? (['TRON'] as const) : []),
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

export const GUEST_CHECKOUT_COINS: GuestCoinInfo[] = GUEST_SUPPORTED_CHAIN_IDS.map(
  (chainId): GuestCoinInfo | null => {
    const chain = CHAINS.find(c => c.id === chainId);
    if (!chain) return null;
    const nativeToken = TOKENS.find(t => t.chain === chainId && t.isNative);
    const paymentCoin = CHAIN_ID_TO_PAYMENT_COIN[chainId] ?? chainId;
    if (!isPaymentCoinEnabled(paymentCoin)) return null;
    return {
      chainId: chainId as string,
      paymentCoin,
      chain,
      nativeToken,
    };
  }
).filter((c): c is GuestCoinInfo => c !== null);

export const GUEST_CHECKOUT_DEFAULT_COINS = ['BTC', 'ETH', 'LTC'];

// ---------------------------------------------------------------------------
// Dynamic coin filtering via GET /v1/payment-methods/{peerID}
// ---------------------------------------------------------------------------

let cachedAcceptedCoins: string[] | null = null;

/**
 * Called after fetching `GET /v1/payment-methods/{peerID}` to cache the
 * seller's accepted crypto tickers. This is the single source of truth
 * across all modes (SaaS, standalone, outpost).
 */
export function setAcceptedCoins(coins: string[]): void {
  cachedAcceptedCoins = coins;
}

export function clearAcceptedCoins(): void {
  cachedAcceptedCoins = null;
}

/**
 * Returns the list of coins available for guest checkout.
 *
 * When the seller's accepted coins have been fetched (via setAcceptedCoins),
 * only those coins are returned. If the seller accepts no crypto, returns [].
 *
 * Before the API data is available, returns the full GUEST_CHECKOUT_COINS
 * list as a safe fallback so the UI can render immediately.
 */
export function getAvailableGuestCoins(): GuestCoinInfo[] {
  if (cachedAcceptedCoins !== null) {
    if (cachedAcceptedCoins.length === 0) return [];
    return GUEST_CHECKOUT_COINS.filter(
      c => cachedAcceptedCoins!.includes(c.chainId) || cachedAcceptedCoins!.includes(c.paymentCoin)
    );
  }
  return GUEST_CHECKOUT_COINS;
}

export function getGuestCoinByPaymentCoin(paymentCoin: string): GuestCoinInfo | undefined {
  return GUEST_CHECKOUT_COINS.find(c => c.paymentCoin === paymentCoin);
}

export function getGuestCoinByChainId(chainId: string): GuestCoinInfo | undefined {
  return GUEST_CHECKOUT_COINS.find(c => c.chainId === chainId);
}
