import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  COMMUNITY_EDITION_MANIFEST,
  COMMUNITY_PAYMENT_CHAINS,
  allowsPaymentChain,
  allowsTokenId,
  intersectCryptoPaymentMethods,
  intersectPaymentChains,
  supportsFiatPayments,
  resolvePaymentSelectorTokenIds,
  isFiatSelectionEnabled,
} from '../../edition';
import { getCommunityEditionFallbackCapabilities } from '../../edition/backendCapabilities';

const REPO_ROOT = resolve(__dirname, '../../../..');
const MANIFEST_PATH = resolve(REPO_ROOT, 'config/editions/community.json');

describe('Community Edition manifest', () => {
  it('matches config/editions/community.json on disk', () => {
    const onDisk = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
    expect(onDisk).toEqual(COMMUNITY_EDITION_MANIFEST);
  });

  it('allows exactly BTC, BCH, LTC, and ZEC transparent payments', () => {
    expect([...COMMUNITY_PAYMENT_CHAINS].sort()).toEqual(['BCH', 'BTC', 'LTC', 'ZEC']);
    expect(allowsPaymentChain('BTC')).toBe(true);
    expect(allowsPaymentChain('BCH')).toBe(true);
    expect(allowsPaymentChain('LTC')).toBe(true);
    expect(allowsPaymentChain('ZEC')).toBe(true);
    expect(allowsPaymentChain('ETH')).toBe(false);
    expect(allowsPaymentChain('SOL')).toBe(false);
    expect(allowsPaymentChain('TRON')).toBe(false);
  });

  it('allows native UTXO token IDs only', () => {
    expect(allowsTokenId('BTC')).toBe(true);
    expect(allowsTokenId('ETH')).toBe(false);
    expect(allowsTokenId('ETHUSDT')).toBe(false);
    expect(allowsTokenId('SOL')).toBe(false);
  });

  it('does not support fiat in Community Edition', () => {
    expect(supportsFiatPayments()).toBe(false);
  });
});

describe('Community Edition capability intersection', () => {
  it('never widens backend chains beyond the edition allowlist', () => {
    const backend = ['BTC', 'ETH', 'SOL', 'LTC'];
    expect(intersectPaymentChains(backend).sort()).toEqual(['BTC', 'LTC']);
  });

  it('drops unsupported backend chains when backend reports extra capability', () => {
    const fallback = getCommunityEditionFallbackCapabilities();
    const widened = intersectPaymentChains([
      ...fallback.paymentChains,
      'ETH',
      'BSC',
      'SOL',
      'TRON',
    ]);
    expect(widened.sort()).toEqual(['BCH', 'BTC', 'LTC', 'ZEC']);
    expect(widened).not.toContain('ETH');
    expect(widened).not.toContain('SOL');
  });

  it('intersects seller crypto methods with edition policy', () => {
    const methods = [
      'BTC',
      'crypto:bip122:000000000019d6689c085ae165831e93:native',
      'ETH',
      'crypto:eip155:1:native',
      'LTC',
      'fiat:stripe:USD',
    ];
    const narrowed = intersectCryptoPaymentMethods(methods);
    expect(narrowed).toContain('BTC');
    expect(narrowed).toContain('LTC');
    expect(narrowed.some(value => value.includes('bip122'))).toBe(true);
    expect(narrowed.some(value => value.toUpperCase().includes('ETH'))).toBe(false);
    expect(narrowed.some(value => value.startsWith('fiat:'))).toBe(false);
  });
});

describe('Community Edition payment selector policy', () => {
  it('returns no tokens for RWA purchase mode', () => {
    expect(
      resolvePaymentSelectorTokenIds({
        isRwaTokenPurchase: true,
        acceptedCurrencies: ['BTC', 'ETH'],
      })
    ).toEqual([]);
  });

  it('ignores showFiatMethods and keeps fiat disabled', () => {
    expect(isFiatSelectionEnabled(true)).toBe(false);
    expect(isFiatSelectionEnabled(false)).toBe(false);
  });

  it('never widens acceptedCurrencies beyond edition allowlist', () => {
    const ids = resolvePaymentSelectorTokenIds({
      acceptedCurrencies: ['BTC', 'ETH', 'crypto:eip155:1:native', 'LTC'],
    });
    expect(ids.sort()).toEqual(['BTC', 'LTC']);
    expect(ids).not.toContain('ETH');
  });

  it('rejects unsupported token IDs before payment', () => {
    expect(allowsTokenId('ETH')).toBe(false);
    expect(allowsTokenId('TRX')).toBe(false);
    expect(allowsTokenId('BTC')).toBe(true);
  });
});
