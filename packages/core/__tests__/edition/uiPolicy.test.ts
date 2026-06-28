import { describe, expect, it } from 'vitest';

import {
  EDITION_I18N_KEYS,
  filterEditionPaymentCoins,
  filterEditionReceivingAccountChains,
  getEditionAdvertisedPaymentTokens,
  getEditionListingPaymentCoinOptions,
  getEditionSupportedChainCount,
} from '../../edition/uiPolicy';

describe('Community Edition UI policy', () => {
  it('advertises only BTC, BCH, LTC, and ZEC on marketing surfaces', () => {
    const tokens = getEditionAdvertisedPaymentTokens();
    expect(tokens.map(token => token.id).sort()).toEqual(['BCH', 'BTC', 'LTC', 'ZEC']);
    expect(getEditionSupportedChainCount()).toBe(4);
  });

  it('filters receiving-account chain pickers to the edition allowlist', () => {
    const allChains = [
      { id: 'BTC', name: 'Bitcoin' },
      { id: 'ETH', name: 'Ethereum' },
      { id: 'SOL', name: 'Solana' },
      { id: 'ZEC', name: 'Zcash' },
    ];
    expect(
      filterEditionReceivingAccountChains(allChains)
        .map(c => c.id)
        .sort()
    ).toEqual(['BTC', 'ZEC']);
  });

  it('limits listing payment coin options to native UTXO rails', () => {
    const options = getEditionListingPaymentCoinOptions();
    expect(options).toHaveLength(4);
    expect(options.map(option => option.code).every(code => code.startsWith('crypto:'))).toBe(true);
    expect(options.some(option => option.code.includes('eip155'))).toBe(false);
  });

  it('filters arbitrary payment coin identifiers', () => {
    expect(
      filterEditionPaymentCoins(['BTC', 'ETH', 'crypto:eip155:1:native', 'LTC']).sort()
    ).toEqual(['BTC', 'LTC']);
  });

  it('exposes community-specific i18n keys for seller onboarding copy', () => {
    expect(EDITION_I18N_KEYS.setupPaymentsDesc).toBe('admin.onboarding.setupPaymentsDescCommunity');
    expect(EDITION_I18N_KEYS.setupPaymentChecklistDesc).toBe(
      'admin.checklist.setupPaymentDescCommunity'
    );
  });
});
