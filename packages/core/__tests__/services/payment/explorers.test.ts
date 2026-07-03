import { describe, expect, it } from 'vitest';

import {
  getBlockExplorerUrl,
  getExplorerResourceUrl,
  getOrderTransactionExplorerUrl,
  resolveOrderExplorerContext,
} from '../../../services/payment/explorers';

describe('getBlockExplorerUrl', () => {
  const sampleTx = 'f98cd55a1234567890abcdef1234567890abcdef1234567890abcdefdfd8ff';

  it('builds BCH tx URL from coin symbol', () => {
    expect(getBlockExplorerUrl(sampleTx, 'BCH')).toBe(
      `https://blockchair.com/bitcoin-cash/transaction/${sampleTx}`
    );
  });

  it('builds BCH tx URL from canonical payment coin', () => {
    expect(getBlockExplorerUrl(sampleTx, 'crypto:bitcoincash:mainnet:native')).toBe(
      `https://blockchair.com/bitcoin-cash/transaction/${sampleTx}`
    );
  });

  it('builds BTC tx URL', () => {
    expect(getBlockExplorerUrl(sampleTx, 'BTC')).toBe(`https://blockstream.info/tx/${sampleTx}`);
  });

  it('builds BCH address URL', () => {
    const address = 'bitcoincash:qpm2qszke5z7fpwxcg9x6g';
    expect(getExplorerResourceUrl(address, 'address', { coin: 'BCH' })).toBe(
      `https://blockchair.com/bitcoin-cash/address/${address}`
    );
  });
});

describe('getOrderTransactionExplorerUrl', () => {
  const sampleTx = 'f98cd55a1234567890abcdef1234567890abcdef1234567890abcdefdfd8ff';

  it('uses paymentCoin only', () => {
    expect(
      getOrderTransactionExplorerUrl(sampleTx, {
        paymentCoin: 'crypto:bitcoincash:mainnet:native',
      })
    ).toBe(`https://blockchair.com/bitcoin-cash/transaction/${sampleTx}`);
  });

  it('returns null without paymentCoin even if currency label exists elsewhere', () => {
    expect(resolveOrderExplorerContext({ paymentCoin: undefined, chainId: 1 })).toBeNull();
    expect(getOrderTransactionExplorerUrl(sampleTx, { paymentCoin: undefined })).toBeNull();
  });
});
