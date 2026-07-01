/**
 * Guest Checkout supported coins — Community Edition UTXO allowlist only.
 *
 * The v0.3 Community runtime supports BTC/BCH/LTC for guest checkout.
 * Commercial or private payment rails are excluded from Community Edition runtime.
 */

import { COMMUNITY_PAYMENT_CHAINS } from '../edition/manifest';
import { intersectCryptoPaymentMethods } from '../edition/capabilities';
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

// ---------------------------------------------------------------------------
// Dynamic coin filtering via GET /v1/payment-methods/{peerID}
// ---------------------------------------------------------------------------

let cachedAcceptedCoins: string[] | null = null;

/**
 * Called after fetching `GET /v1/payment-methods/{peerID}` to cache the
 * seller's accepted crypto tickers.
 */
export function setAcceptedCoins(coins: string[]): void {
  cachedAcceptedCoins = intersectCryptoPaymentMethods(coins);
}

export function clearAcceptedCoins(): void {
  cachedAcceptedCoins = null;
}

/**
 * Returns the list of coins available for guest checkout.
 *
 * When the seller's accepted coins have been fetched (via setAcceptedCoins),
 * only edition-allowed coins are returned. If the seller accepts no crypto, returns [].
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
