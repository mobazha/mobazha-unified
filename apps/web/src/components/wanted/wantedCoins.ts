// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { getChainById, getPaymentCoinDisplayLabel, getTokenById } from '@mobazha/core/data/tokens';
import { TOKENS, getAvailablePaymentTokens, groupTokensByCurrency } from '@/components/Payment/config';

/**
 * Currencies a buy request may be quoted and settled in.
 *
 * The list is not written here. It is the same set the payment selector offers —
 * the tokens this node can actually be paid in — because a board that offered a
 * currency its seller has no way to receive would take a buyer's request and
 * leave nobody able to answer it. Adding a chain to the payment registry adds it
 * here and retiring one takes it away, with no second list to keep in step.
 *
 * Stablecoins appear once per chain: USDT on Ethereum and USDT on Solana are two
 * assets with two receiving addresses, and a seller told only "USDT" cannot know
 * which chain the money lands on. Native coins carry no suffix because there the
 * chain *is* the asset.
 *
 * The ids are the token registry's, so a budget, an offer and the eventual
 * listing all quote against the same thing.
 */
export interface WantedCoin {
  id: string;
  label: string;
}

/** Base and Arbitrum only exist as chains in the registry, so name them here. */
const CHAIN_ONLY_LABELS: Record<string, string> = {
  BASE: 'Base',
  ARB: 'Arbitrum',
};

export function wantedCoinLabel(id: string): string {
  const token = getTokenById(id);
  if (token && !token.isNative) {
    const chainName = getChainById(token.chain)?.name ?? token.chain;
    return `${getPaymentCoinDisplayLabel(id) || id} · ${chainName}`;
  }
  return CHAIN_ONLY_LABELS[id] ?? (getPaymentCoinDisplayLabel(id) || id);
}

/**
 * The currencies to offer, in the order the payment selector groups them:
 * stablecoins, then native coins, then everything else.
 *
 * It is a function rather than a constant because what this node can be paid in
 * is runtime state: it is read when the form renders, not when the module loads.
 * If the runtime has not said — or says nothing at all — the registry's own
 * enabled tokens are offered instead, because a currency list with no currencies
 * in it is a board nobody can post on.
 */
export function getWantedCoins(): WantedCoin[] {
  const payable = getAvailablePaymentTokens();
  const tokens = payable.length > 0 ? payable : TOKENS.filter(token => !token.disabled);
  return groupTokensByCurrency(tokens).flatMap(group =>
    group.tokens.map(token => ({ id: token.id, label: wantedCoinLabel(token.id) }))
  );
}

/**
 * The currency a request opens with: USDT on Ethereum, which is what most offers
 * settle in — otherwise the first currency the node can take.
 */
export function defaultWantedCoin(coins: readonly WantedCoin[]): string {
  return (
    coins.find(coin => coin.id === 'ETHUSDT')?.id ??
    coins.find(coin => coin.id.includes('USDT'))?.id ??
    coins[0]?.id ??
    'ETHUSDT'
  );
}
