/**
 * Community Edition UI policy — marketing surfaces, configuration allowlists, and copy keys.
 */

import { CHAINS, TOKENS, mustAssetIdFromTokenId } from '../data/tokens';
import { allowsPaymentChain, allowsPaymentCoin } from './capabilities';
import { COMMUNITY_PAYMENT_CHAINS } from './manifest';

export interface AdvertisedPaymentToken {
  id: string;
  name: string;
}

/** i18n keys for Community Edition seller/onboarding copy. */
export const EDITION_I18N_KEYS = {
  setupPaymentsDesc: 'admin.onboarding.setupPaymentsDescCommunity',
  setupPaymentChecklistDesc: 'admin.checklist.setupPaymentDescCommunity',
  featurePricing: 'admin.onboarding.featurePricingCommunity',
  settingsPaymentsDesc: 'admin.settings.paymentsDescCommunity',
  cryptoNativeDescription: 'saasHome.valueProps.cryptoNativeDescriptionCommunity',
  defaultStoreFaqPaymentAnswer: 'storeSections.defaults.faqPaymentAnswerCommunity',
} as const;

/** Plain-text default for store FAQ templates (English seed content). */
export function getEditionDefaultPaymentMethodsAnswer(): string {
  return 'Bitcoin, Bitcoin Cash, Litecoin, and transparent Zcash.';
}

/** Tokens/chains advertised on marketing surfaces (footer, homepage stats). */
export function getEditionAdvertisedPaymentTokens(): AdvertisedPaymentToken[] {
  return COMMUNITY_PAYMENT_CHAINS.map(chainId => {
    const chain = CHAINS.find(c => c.id === chainId);
    return { id: chainId, name: chain?.name ?? chainId };
  });
}

export function getEditionSupportedChainCount(): number {
  return COMMUNITY_PAYMENT_CHAINS.length;
}

/** Chains sellers may configure when adding a new receiving account. */
export function filterEditionReceivingAccountChains<T extends { id: string }>(
  chains: readonly T[]
): T[] {
  return chains.filter(chain => allowsPaymentChain(chain.id));
}

export interface EditionPaymentCoinOption {
  code: string;
  name: string;
}

/** Native UTXO payment coins selectable in listing/RWA payment configuration. */
export function getEditionListingPaymentCoinOptions(): EditionPaymentCoinOption[] {
  return COMMUNITY_PAYMENT_CHAINS.map(chainId => {
    const chain = CHAINS.find(c => c.id === chainId);
    const nativeToken = TOKENS.find(token => token.chain === chainId && token.isNative);
    const code = nativeToken?.assetId ?? mustAssetIdFromTokenId(chainId);
    return {
      code,
      name: `${chain?.name ?? chainId} (${chainId})`,
    };
  });
}

/** Narrow arbitrary payment coin identifiers to the edition allowlist. */
export function filterEditionPaymentCoins(coins: readonly string[]): string[] {
  return coins.filter(coin => allowsPaymentCoin(coin));
}
