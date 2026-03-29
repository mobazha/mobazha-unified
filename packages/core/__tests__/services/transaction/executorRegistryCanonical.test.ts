import { describe, expect, it } from 'vitest';

import { resolveChainCategory } from '../../../services/transaction/executorRegistry';

describe('resolveChainCategory (canonical payment coin)', () => {
  it('resolves canonical EVM and UTXO coins', () => {
    expect(resolveChainCategory('crypto:eip155:56:native')).toBe('evm');
    expect(
      resolveChainCategory(
        'crypto:bip122:000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f:native'
      )
    ).toBe('utxo');
  });

  it('resolves canonical Solana and TRON coins', () => {
    expect(
      resolveChainCategory('crypto:solana:mainnet:spl:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
    ).toBe('solana');
    expect(resolveChainCategory('crypto:tron:mainnet:native')).toBe('tron');
  });

  it('keeps fiat out of chain executors', () => {
    expect(resolveChainCategory('fiat:stripe:USD')).toBeNull();
  });
});
