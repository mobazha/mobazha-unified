import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  generateAttributionUUID,
  getOrCreateNativeMarketplaceJourneyState,
  nativeMarketplaceAttributionStorageKey,
  parseNativeMarketplaceUtmFromSearchParams,
  parseReferrerHost,
  readNativeMarketplaceJourneyState,
  sanitizeNativeMarketplaceUtmValue,
} from '../../curation/nativeMarketplaceAttribution';

describe('native marketplace attribution helpers', () => {
  const marketplaceID = 'mp-test';
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const originalCrypto = globalThis.crypto;

  beforeEach(() => {
    sessionStorage.clear();
    Object.defineProperty(globalThis, 'crypto', {
      value: originalCrypto,
      configurable: true,
    });
  });

  it('sanitizes UTM values and caps them at 80 chars', () => {
    expect(sanitizeNativeMarketplaceUtmValue('summer<script>alert(1)</script> campaign')).toBe(
      'summerscriptalert1script campaign'
    );
    expect(sanitizeNativeMarketplaceUtmValue('a'.repeat(120))).toHaveLength(80);
  });

  it('parses only whitelisted UTM params', () => {
    const parsed = parseNativeMarketplaceUtmFromSearchParams(
      new URLSearchParams('utm_source=newsletter&utm_medium=email&utm_campaign=spring&foo=bar')
    );
    expect(parsed).toEqual({
      source: 'newsletter',
      medium: 'email',
      campaign: 'spring',
    });
  });

  it('extracts referrer hostname only (no full URL path/query)', () => {
    expect(parseReferrerHost('https://example.com/path?a=1#hash')).toBe('example.com');
  });

  it('creates anonymous journey once and reuses stored UTM in session', () => {
    const initial = getOrCreateNativeMarketplaceJourneyState({
      marketplaceID,
      searchParams: new URLSearchParams('utm_source=launch&utm_medium=social&utm_campaign=gate1'),
      referrer: 'https://ref.example/path?x=1',
    });
    expect(initial.journeyID).toBeTruthy();
    expect(initial.source).toBe('launch');
    expect(initial.medium).toBe('social');
    expect(initial.campaign).toBe('gate1');
    expect(initial.referrerHost).toBe('ref.example');

    const reused = getOrCreateNativeMarketplaceJourneyState({
      marketplaceID,
      searchParams: new URLSearchParams('utm_source=other'),
      referrer: 'https://another.example',
    });
    expect(reused).toEqual(initial);

    expect(readNativeMarketplaceJourneyState(marketplaceID)).toEqual(initial);
  });

  it('always generates RFC4122 UUIDs across all fallback branches', () => {
    const fromRandomUUID = generateAttributionUUID();
    expect(fromRandomUUID).toMatch(uuidPattern);

    Object.defineProperty(globalThis, 'crypto', {
      value: {
        randomUUID: () => 'not-a-valid-uuid',
        getRandomValues: (buffer: Uint8Array) => {
          for (let index = 0; index < buffer.length; index += 1) {
            buffer[index] = (index * 13 + 7) & 0xff;
          }
          return buffer;
        },
      },
      configurable: true,
    });
    const fromInvalidRandomUUIDFallback = generateAttributionUUID();
    expect(fromInvalidRandomUUIDFallback).toMatch(uuidPattern);
    expect(fromInvalidRandomUUIDFallback).not.toBe('not-a-valid-uuid');

    Object.defineProperty(globalThis, 'crypto', {
      value: {
        randomUUID: () => {
          throw new Error('randomUUID unavailable');
        },
        getRandomValues: () => {
          throw new Error('entropy source blocked');
        },
      },
      configurable: true,
    });
    const fromThrowingCrypto = generateAttributionUUID();
    expect(fromThrowingCrypto).toMatch(uuidPattern);

    Object.defineProperty(globalThis, 'crypto', {
      value: {
        getRandomValues: (buffer: Uint8Array) => {
          for (let index = 0; index < buffer.length; index += 1) {
            buffer[index] = (index * 17) & 0xff;
          }
          return buffer;
        },
      },
      configurable: true,
    });
    const fromGetRandomValues = generateAttributionUUID();
    expect(fromGetRandomValues).toMatch(uuidPattern);

    Object.defineProperty(globalThis, 'crypto', {
      value: undefined,
      configurable: true,
    });
    const fromMathRandom = generateAttributionUUID();
    expect(fromMathRandom).toMatch(uuidPattern);
  });

  it('silently degrades when journey state storage write throws', () => {
    const sessionStoragePrototype = Object.getPrototypeOf(window.sessionStorage);
    const setItemSpy = vi.spyOn(sessionStoragePrototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(() =>
      getOrCreateNativeMarketplaceJourneyState({
        marketplaceID,
        searchParams: new URLSearchParams('utm_source=collectibles&utm_medium=web'),
        referrer: 'https://ref.example',
      })
    ).not.toThrow();

    const created = getOrCreateNativeMarketplaceJourneyState({
      marketplaceID,
      searchParams: new URLSearchParams('utm_source=collectibles&utm_medium=web'),
      referrer: 'https://ref.example',
    });

    expect(created.journeyID).toMatch(uuidPattern);
    expect(created.source).toBe('collectibles');
    expect(created.medium).toBe('web');
    expect(setItemSpy).toHaveBeenCalled();
    setItemSpy.mockRestore();
  });

  it('treats invalid stored journeyID as absent and rebuilds a valid journey state', () => {
    sessionStorage.setItem(
      nativeMarketplaceAttributionStorageKey(marketplaceID),
      JSON.stringify({
        journeyID: 'not-a-uuid',
        source: 'launch',
      })
    );

    expect(readNativeMarketplaceJourneyState(marketplaceID)).toBeNull();

    const rebuilt = getOrCreateNativeMarketplaceJourneyState({
      marketplaceID,
      searchParams: new URLSearchParams('utm_source=recreated'),
      referrer: '',
    });

    expect(rebuilt.journeyID).toMatch(uuidPattern);
    expect(rebuilt.source).toBe('recreated');
    expect(readNativeMarketplaceJourneyState(marketplaceID)?.journeyID).toBe(rebuilt.journeyID);
  });
});
