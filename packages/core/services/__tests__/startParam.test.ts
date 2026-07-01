import { describe, it, expect } from 'vitest';
import { parseStartParam, buildStartParam } from '../startParam';

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
});
