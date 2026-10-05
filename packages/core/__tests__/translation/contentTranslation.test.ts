import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  normalizeLocaleTag,
  readCachedTranslation,
  shouldTranslate,
  translateText,
} from '../../services/translation/contentTranslation';

const providerPayload = (translated: string, original: string) => [
  [[translated, original, null, null, 10]],
  null,
  'en',
];

describe('contentTranslation', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('normalizeLocaleTag', () => {
    it('maps regional and cased tags onto our locale ids', () => {
      expect(normalizeLocaleTag('zh-Hans')).toBe('zh');
      expect(normalizeLocaleTag('ZH_cn')).toBe('zh');
      expect(normalizeLocaleTag('pt-BR')).toBe('pt');
      expect(normalizeLocaleTag('sv')).toBeUndefined();
      expect(normalizeLocaleTag(null)).toBeUndefined();
    });
  });

  describe('shouldTranslate', () => {
    it('translates text whose language differs from the reader', () => {
      expect(shouldTranslate('DJI Air 3 Drone', 'en', 'zh')).toBe(true);
    });

    it('skips identical languages, blank strings and non-linguistic text', () => {
      expect(shouldTranslate('DJI Air 3 Drone', 'en', 'en')).toBe(false);
      expect(shouldTranslate('   ', 'en', 'zh')).toBe(false);
      expect(shouldTranslate('1,234.00', 'en', 'zh')).toBe(false);
    });

    it('leaves very long descriptions alone', () => {
      expect(shouldTranslate('a'.repeat(5001), 'en', 'zh')).toBe(false);
    });
  });

  describe('translateText', () => {
    it('parses the provider payload and caches the result', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => providerPayload('大疆 Air 3 无人机', 'DJI Air 3 Drone'),
      });
      vi.stubGlobal('fetch', fetchMock);

      await expect(translateText('DJI Air 3 Drone', 'en', 'zh')).resolves.toBe('大疆 Air 3 无人机');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(readCachedTranslation('DJI Air 3 Drone', 'en', 'zh')).toBe('大疆 Air 3 无人机');

      // Second call is served from the cache — no extra request.
      await expect(translateText('DJI Air 3 Drone', 'en', 'zh')).resolves.toBe('大疆 Air 3 无人机');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('falls back to the original text when the provider fails', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
      await expect(translateText('DJI Air 3 Drone', 'en', 'zh')).resolves.toBe('DJI Air 3 Drone');
    });

    it('falls back to the original text on a non-2xx response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
      await expect(translateText('DJI Air 3 Drone', 'en', 'zh')).resolves.toBe('DJI Air 3 Drone');
    });

    it('skips the request entirely when source and target match', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      await expect(translateText('DJI Air 3 Drone', 'en', 'en')).resolves.toBe('DJI Air 3 Drone');
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
