import { describe, expect, it } from 'vitest';

import { getSolanaExplorerAddressUrl, getSolanaExplorerTxUrl } from '../../collectibles/explorer';

describe('collectibles explorer helpers', () => {
  it('builds mainnet tx url', () => {
    expect(getSolanaExplorerTxUrl('sig123', false)).toBe('https://explorer.solana.com/tx/sig123');
  });

  it('builds devnet tx url when requested', () => {
    expect(getSolanaExplorerTxUrl('sig123', true)).toBe(
      'https://explorer.solana.com/tx/sig123?cluster=devnet'
    );
  });

  it('builds address url', () => {
    expect(getSolanaExplorerAddressUrl('Mint111', false)).toBe(
      'https://explorer.solana.com/address/Mint111'
    );
  });

  it('returns empty string for blank signature', () => {
    expect(getSolanaExplorerTxUrl('  ', false)).toBe('');
  });
});
