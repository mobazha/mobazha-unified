import { afterEach, describe, expect, it } from 'vitest';
import { setAuthMode } from '@mobazha/core';
import { buildProductOgImageUrl, buildProductPageUrl } from '@/lib/ssrProduct';

describe('buildProductPageUrl', () => {
  afterEach(() => {
    setAuthMode('hosted');
  });

  it('includes peerID for oEmbed discovery in hosted mode', () => {
    setAuthMode('hosted');
    const peerID = '12D3KooWJbXTgDy8asGBri6ewc1PVeA361Z93abc';
    expect(buildProductPageUrl('https://test-new.mobazha.org', 'icon-pack-3000', peerID)).toBe(
      `https://test-new.mobazha.org/product/icon-pack-3000?peerID=${encodeURIComponent(peerID)}`
    );
  });

  it('omits peerID in standalone mode', () => {
    setAuthMode('standalone');
    const peerID = '12D3KooWJbXTgDy8asGBri6ewc1PVeA361Z93abc';
    expect(buildProductPageUrl('https://test-new.mobazha.org', 'icon-pack-3000', peerID)).toBe(
      'https://test-new.mobazha.org/product/icon-pack-3000'
    );
  });
});

describe('buildProductOgImageUrl', () => {
  afterEach(() => {
    setAuthMode('hosted');
  });

  it('omits query when peerID is absent', () => {
    expect(buildProductOgImageUrl('https://app.mobazha.org', 'icon-pack-3000')).toBe(
      'https://app.mobazha.org/product/icon-pack-3000/opengraph-image'
    );
  });

  it('includes peerID query for store-scoped listings in hosted mode', () => {
    setAuthMode('hosted');
    const peerID = '12D3KooWJbXTgDy8asGBri6ewc1PVeA361Z93abc';
    expect(buildProductOgImageUrl('https://app.mobazha.org', 'icon-pack-3000', peerID)).toBe(
      `https://app.mobazha.org/product/icon-pack-3000/opengraph-image?peerID=${encodeURIComponent(peerID)}`
    );
  });

  it('omits peerID in standalone mode', () => {
    setAuthMode('standalone');
    const peerID = '12D3KooWJbXTgDy8asGBri6ewc1PVeA361Z93abc';
    expect(buildProductOgImageUrl('https://app.mobazha.org', 'icon-pack-3000', peerID)).toBe(
      'https://app.mobazha.org/product/icon-pack-3000/opengraph-image'
    );
  });
});
