import { describe, expect, it, beforeEach } from 'vitest';
import {
  getCurationHomePath,
  parseCurationHomePath,
  resolveCurationMarketBackHref,
  resolveCurationMarketplaceIdentifier,
  setCurationHomePathFromRuntimeConfig,
  shouldRenderCurationMarketplaceAtRoot,
} from '../../config/curationHomePath';

describe('parseCurationHomePath', () => {
  it('accepts safe marketplace paths', () => {
    expect(parseCurationHomePath('/marketplace/m2-wilson')).toBe('/marketplace/m2-wilson');
    expect(parseCurationHomePath('  /marketplace/collectibles-demo  ')).toBe(
      '/marketplace/collectibles-demo'
    );
  });

  it('rejects protocol-relative, absolute, credential, and query-only values', () => {
    expect(parseCurationHomePath('//evil.example/marketplace/foo')).toBeNull();
    expect(
      parseCurationHomePath('https://collectibles.mobazha.org/marketplace/m2-wilson')
    ).toBeNull();
    expect(parseCurationHomePath('javascript:alert(1)')).toBeNull();
    expect(
      parseCurationHomePath('user:pass@collectibles.mobazha.org/marketplace/m2-wilson')
    ).toBeNull();
    expect(parseCurationHomePath('?ref=card')).toBeNull();
    expect(parseCurationHomePath('/')).toBeNull();
    expect(parseCurationHomePath('/marketplace/')).toBeNull();
    expect(parseCurationHomePath('/search?q=*')).toBeNull();
  });
});

describe('resolveCurationMarketplaceIdentifier', () => {
  it('extracts slug from validated marketplace home paths', () => {
    expect(resolveCurationMarketplaceIdentifier('/marketplace/m2-wilson')).toBe('m2-wilson');
    expect(resolveCurationMarketplaceIdentifier('/marketplace/collectibles-demo')).toBe(
      'collectibles-demo'
    );
  });

  it('returns null for non-marketplace paths', () => {
    expect(resolveCurationMarketplaceIdentifier('/search')).toBeNull();
    expect(resolveCurationMarketplaceIdentifier('/marketplace/')).toBeNull();
  });
});

describe('runtime curation home path', () => {
  beforeEach(() => {
    setCurationHomePathFromRuntimeConfig(undefined);
  });

  it('stores only validated paths from runtime-config', () => {
    setCurationHomePathFromRuntimeConfig('/marketplace/m2-wilson');
    expect(getCurationHomePath()).toBe('/marketplace/m2-wilson');

    setCurationHomePathFromRuntimeConfig('//evil.example/marketplace/foo');
    expect(getCurationHomePath()).toBeNull();
  });
});

describe('shouldRenderCurationMarketplaceAtRoot', () => {
  const base = {
    pathname: '/',
    curationHomePath: '/marketplace/m2-wilson',
    isStandalone: false,
    storefrontMode: false,
    isSubMarket: false,
  };

  it('renders at root only for eligible SaaS hosts with a configured curation home', () => {
    expect(shouldRenderCurationMarketplaceAtRoot(base)).toBe(true);
    expect(
      shouldRenderCurationMarketplaceAtRoot({ ...base, pathname: '/marketplace/m2-wilson' })
    ).toBe(false);
    expect(shouldRenderCurationMarketplaceAtRoot({ ...base, curationHomePath: null })).toBe(false);
    expect(shouldRenderCurationMarketplaceAtRoot({ ...base, isStandalone: true })).toBe(false);
    expect(shouldRenderCurationMarketplaceAtRoot({ ...base, storefrontMode: true })).toBe(false);
    expect(shouldRenderCurationMarketplaceAtRoot({ ...base, isSubMarket: true })).toBe(false);
    expect(shouldRenderCurationMarketplaceAtRoot({ ...base, needsOnboarding: true })).toBe(false);
  });
});

describe('resolveCurationMarketBackHref', () => {
  beforeEach(() => {
    setCurationHomePathFromRuntimeConfig(undefined);
  });

  it('returns / when market href matches configured curation home', () => {
    setCurationHomePathFromRuntimeConfig('/marketplace/m2-wilson');
    expect(resolveCurationMarketBackHref('/marketplace/m2-wilson')).toBe('/');
    expect(resolveCurationMarketBackHref('/marketplace/m2-wilson/')).toBe('/');
  });

  it('returns original market href when curation home is unset or different', () => {
    expect(resolveCurationMarketBackHref('/marketplace/other-market')).toBe(
      '/marketplace/other-market'
    );

    setCurationHomePathFromRuntimeConfig('/marketplace/m2-wilson');
    expect(resolveCurationMarketBackHref('/marketplace/other-market')).toBe(
      '/marketplace/other-market'
    );
  });

  it('accepts an explicit curation home override', () => {
    expect(resolveCurationMarketBackHref('/marketplace/m2-wilson', '/marketplace/m2-wilson')).toBe(
      '/'
    );
    expect(resolveCurationMarketBackHref('/marketplace/m2-wilson', '/marketplace/other')).toBe(
      '/marketplace/m2-wilson'
    );
  });
});
