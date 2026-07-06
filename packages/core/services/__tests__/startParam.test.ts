import { describe, it, expect } from 'vitest';
import { parseStartParam, buildStartParam, resolveTelegramStartParam } from '../startParam';

describe('resolveTelegramStartParam', () => {
  it('prefers the signed init-data value', () => {
    expect(resolveTelegramStartParam('V7k3mQ2xN9pRt4YwLc8Hjg', 'N4b8tR6pQ2xKm7YwLc3Hjg')).toBe(
      'V7k3mQ2xN9pRt4YwLc8Hjg'
    );
  });

  it('falls back to tgWebAppStartParam while init data is unavailable', () => {
    expect(resolveTelegramStartParam(undefined, 'V7k3mQ2xN9pRt4YwLc8Hjg')).toBe(
      'V7k3mQ2xN9pRt4YwLc8Hjg'
    );
  });

  it('ignores empty values', () => {
    expect(resolveTelegramStartParam('  ', '')).toBeNull();
  });
});

describe('parseStartParam', () => {
  describe('legacy single-segment inputs', () => {
    it('returns empty object for undefined / null / empty input', () => {
      expect(parseStartParam(undefined)).toEqual({});
      expect(parseStartParam(null)).toEqual({});
      expect(parseStartParam('')).toEqual({});
    });

    it('parses store_{peerID}', () => {
      expect(parseStartParam('store_QmYWtznKnUDxL8hoXoe3uRL8tRnCa9vJ5E9HkP4Zeer1')).toEqual({
        storePeerID: 'QmYWtznKnUDxL8hoXoe3uRL8tRnCa9vJ5E9HkP4Zeer1',
      });
    });

    it('parses bind_{sessionID}', () => {
      expect(parseStartParam('bind_abc123XYZ')).toEqual({ bindSessionId: 'abc123XYZ' });
    });

    it('parses s_{shortCode}', () => {
      expect(parseStartParam('s_xyz')).toEqual({ shortCode: 'xyz' });
    });

    it('parses sf_{slug}', () => {
      expect(parseStartParam('sf_summer-sale')).toEqual({ storefrontSlug: 'summer-sale' });
    });

    it('parses an opaque routed-store token', () => {
      expect(parseStartParam('V7k3mQ2xN9pRt4YwLc8Hjg')).toEqual({
        storeRouteToken: 'V7k3mQ2xN9pRt4YwLc8Hjg',
      });
    });

    it('does not split a valid token containing a double underscore', () => {
      expect(parseStartParam('AAAA__AAAAAAAAAAAAAAAA')).toEqual({
        storeRouteToken: 'AAAA__AAAAAAAAAAAAAAAA',
      });
    });
  });

  describe('multi-segment v2 inputs', () => {
    it('parses store + storefront combo', () => {
      expect(parseStartParam('store_QmABC123__sf_summer-sale')).toEqual({
        storePeerID: 'QmABC123',
        storefrontSlug: 'summer-sale',
      });
    });

    it('parses storefront + bind combo', () => {
      expect(parseStartParam('sf_flash-deal__bind_session42')).toEqual({
        storefrontSlug: 'flash-deal',
        bindSessionId: 'session42',
      });
    });

    it('preserves order-independence', () => {
      const a = parseStartParam('store_QmX__sf_black-friday');
      const b = parseStartParam('sf_black-friday__store_QmX');
      expect(a).toEqual(b);
    });

    it('ignores duplicate segments of the same type (first wins)', () => {
      expect(parseStartParam('store_QmFirst__store_QmSecond')).toEqual({
        storePeerID: 'QmFirst',
      });
    });
  });

  describe('security and robustness', () => {
    it('rejects peerID with invalid characters', () => {
      expect(parseStartParam('store_Qm/../evil')).toEqual({});
    });

    it('rejects slug with uppercase or special chars', () => {
      expect(parseStartParam('sf_Summer_Sale')).toEqual({});
      expect(parseStartParam('sf_flash!deal')).toEqual({});
    });

    it('rejects peerID exceeding 80 chars', () => {
      const tooLong = 'a'.repeat(81);
      expect(parseStartParam(`store_${tooLong}`)).toEqual({});
    });

    it('rejects slug exceeding 64 chars', () => {
      const tooLong = 'a'.repeat(65);
      expect(parseStartParam(`sf_${tooLong}`)).toEqual({});
    });

    it('rejects enumerable and malformed route values', () => {
      expect(parseStartParam('003')).toEqual({});
      expect(parseStartParam('../admin')).toEqual({});
      expect(parseStartParam('a'.repeat(21))).toEqual({});
      expect(parseStartParam('a'.repeat(23))).toEqual({});
    });

    it('drops unknown segment prefixes silently', () => {
      expect(parseStartParam('future_magic__store_QmX')).toEqual({ storePeerID: 'QmX' });
    });

    it('tolerates whitespace between segments', () => {
      expect(parseStartParam('store_QmX__  __sf_deal')).toEqual({
        storePeerID: 'QmX',
        storefrontSlug: 'deal',
      });
    });

    it('ignores empty prefix values', () => {
      expect(parseStartParam('store___sf_')).toEqual({});
    });
  });
});

describe('buildStartParam', () => {
  it('round-trips parseable input', () => {
    const built = buildStartParam({
      storePeerID: 'QmTestPeer',
      storefrontSlug: 'summer-sale',
    });
    expect(parseStartParam(built)).toEqual({
      storePeerID: 'QmTestPeer',
      storefrontSlug: 'summer-sale',
    });
  });

  it('returns empty string when nothing valid is supplied', () => {
    expect(buildStartParam({})).toBe('');
    expect(buildStartParam({ storefrontSlug: 'INVALID_SLUG' })).toBe('');
  });

  it('emits stable segment order (store, sf, bind, s)', () => {
    const built = buildStartParam({
      shortCode: 'xyz',
      bindSessionId: 'sess42',
      storefrontSlug: 'deal',
      storePeerID: 'QmX',
    });
    expect(built).toBe('store_QmX__sf_deal__bind_sess42__s_xyz');
  });

  it('emits a routed-store token as an exclusive start parameter', () => {
    expect(
      buildStartParam({
        storeRouteToken: 'V7k3mQ2xN9pRt4YwLc8Hjg',
        storefrontSlug: 'ignored',
      })
    ).toBe('V7k3mQ2xN9pRt4YwLc8Hjg');
  });
});
