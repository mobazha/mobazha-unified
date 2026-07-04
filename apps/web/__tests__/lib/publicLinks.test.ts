import { describe, expect, it } from 'vitest';
import { PUBLIC_COMMUNITY_URLS, PUBLIC_DOCS_URLS } from '@/lib/publicLinks';

describe('public product links', () => {
  it('routes documentation entry points to the canonical documentation origin', () => {
    expect(PUBLIC_DOCS_URLS).toEqual({
      home: 'https://docs.mobazha.org',
      gettingStarted: 'https://docs.mobazha.org/start',
      api: 'https://docs.mobazha.org/build/api',
      support: 'https://docs.mobazha.org/support',
    });

    for (const value of Object.values(PUBLIC_DOCS_URLS)) {
      const url = new URL(value);
      expect(url.protocol).toBe('https:');
      expect(url.hostname).toBe('docs.mobazha.org');
      expect(url.pathname).not.toContain('/wiki');
    }
  });

  it('routes community support to the current Mobazha channel', () => {
    expect(PUBLIC_COMMUNITY_URLS.telegram).toBe('https://t.me/MobazhaHQ');
  });
});
