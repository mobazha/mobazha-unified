import { describe, expect, it } from 'vitest';

import { parseScanResult, type AddressValidator } from '../../utils/scanResult';

const PEER_ID = '12D3KooWabc123';

const validateAddress: AddressValidator = (address, coinHint) => {
  if (coinHint === 'BTC' && address === 'bc1qvalidaddress') {
    return { coin: 'BTC' };
  }
  if (!coinHint && address === 'bc1qvalidaddress') {
    return { coin: 'BTC' };
  }
  return undefined;
};

describe('parseScanResult', () => {
  it('parses current Mobazha store URLs', () => {
    expect(parseScanResult(`https://app.mobazha.org/store/${PEER_ID}`)).toEqual({
      type: 'store',
      peerID: PEER_ID,
    });
  });

  it('parses current Mobazha product URLs with peerID context', () => {
    expect(
      parseScanResult(`https://app.mobazha.org/product/summer-sale?peerID=${PEER_ID}`)
    ).toEqual({
      type: 'listing',
      peerID: PEER_ID,
      slug: 'summer-sale',
    });
  });

  it('parses Telegram tg:// deep links', () => {
    expect(parseScanResult(`tg://resolve?domain=mobazha_bot&startapp=store_${PEER_ID}`)).toEqual({
      type: 'store',
      peerID: PEER_ID,
    });
  });

  it('keeps valid BIP21 payment URIs only after address validation', () => {
    expect(parseScanResult('bitcoin:bc1qvalidaddress?amount=0.01', { validateAddress })).toEqual({
      type: 'payment',
      coin: 'BTC',
      address: 'bc1qvalidaddress',
      amount: '0.01',
    });
  });

  it('does not classify invalid BIP21 payment URIs as payments', () => {
    expect(parseScanResult('bitcoin:not-a-real-address', { validateAddress })).toEqual({
      type: 'search',
      query: 'bitcoin:not-a-real-address',
    });
  });

  it('does not classify malformed EVM payment URIs as payments', () => {
    expect(parseScanResult('ethereum:0x123')).toEqual({
      type: 'search',
      query: 'ethereum:0x123',
    });
  });
});
