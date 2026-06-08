import { afterEach, describe, expect, it } from 'vitest';

import { setAuthMode } from '../../config/env';
import {
  buildEmbedProductHref,
  buildProductHref,
  buildProductOgImageHref,
  getProductPeerIDParam,
  parseCompositeListingSlug,
  resolveProductPagePeerID,
} from '../../utils/productUrl';

describe('productUrl', () => {
  afterEach(() => {
    setAuthMode('hosted');
  });

  it('builds a product href with the standard peerID query param', () => {
    expect(buildProductHref('code-review', 'QmSellerPeer')).toBe(
      '/product/code-review?peerID=QmSellerPeer'
    );
  });

  it('builds an absolute product URL and preserves additional params', () => {
    expect(
      buildProductHref('icon pack', 'QmSellerPeer', {
        baseUrl: 'https://app.mobazha.org',
        params: { utm_source: 'share' },
      })
    ).toBe('https://app.mobazha.org/product/icon%20pack?peerID=QmSellerPeer&utm_source=share');
  });

  it('reads the standard peerID param only', () => {
    expect(getProductPeerIDParam(new URLSearchParams('peerID=QmStandard'))).toBe('QmStandard');
    expect(getProductPeerIDParam(new URLSearchParams('peer=QmLegacy'))).toBeUndefined();
  });

  it('keeps clean product hrefs in standalone mode', () => {
    setAuthMode('standalone');

    expect(buildProductHref('code-review', 'QmSellerPeer')).toBe('/product/code-review');
  });

  it('can force a peerID when a caller needs a scoped SaaS href', () => {
    setAuthMode('standalone');

    expect(buildProductHref('code-review', 'QmSellerPeer', { includePeerID: true })).toBe(
      '/product/code-review?peerID=QmSellerPeer'
    );
  });

  it('parses composite listing index slugs', () => {
    expect(parseCompositeListingSlug('QmSellerPeer/icon-pack')).toEqual({
      peerID: 'QmSellerPeer',
      slug: 'icon-pack',
    });
    expect(parseCompositeListingSlug('wireless-headphones')).toEqual({
      slug: 'wireless-headphones',
    });
  });

  it('builds embed product links with UTM params', () => {
    setAuthMode('hosted');

    expect(buildEmbedProductHref('icon-pack', 'QmSellerPeer', 'https://app.mobazha.org')).toBe(
      'https://app.mobazha.org/product/icon-pack?peerID=QmSellerPeer&utm_source=embed&utm_medium=iframe&utm_campaign=product_card'
    );
  });

  it('builds OG image hrefs with the same peerID rules as product hrefs', () => {
    setAuthMode('hosted');

    expect(buildProductOgImageHref('icon pack', 'QmSellerPeer')).toBe(
      '/product/icon%20pack/opengraph-image?peerID=QmSellerPeer'
    );
    expect(
      buildProductOgImageHref('icon-pack', 'QmSellerPeer', {
        baseUrl: 'https://app.mobazha.org',
      })
    ).toBe('https://app.mobazha.org/product/icon-pack/opengraph-image?peerID=QmSellerPeer');
  });

  it('omits peerID on OG image hrefs in standalone mode', () => {
    setAuthMode('standalone');

    expect(buildProductOgImageHref('icon-pack', 'QmSellerPeer')).toBe(
      '/product/icon-pack/opengraph-image'
    );
  });

  it('prefers request peerID over vendor peerID for canonical resolution', () => {
    setAuthMode('hosted');

    expect(resolveProductPagePeerID('QmRequest', 'QmVendor')).toBe('QmRequest');
  });

  it('falls back to vendor peerID in hosted mode when request param is absent', () => {
    setAuthMode('hosted');

    expect(resolveProductPagePeerID(undefined, 'QmVendor')).toBe('QmVendor');
  });

  it('omits peerID resolution in standalone mode even when vendor peerID exists', () => {
    setAuthMode('standalone');

    expect(resolveProductPagePeerID(undefined, 'QmVendor')).toBeUndefined();
  });
});
