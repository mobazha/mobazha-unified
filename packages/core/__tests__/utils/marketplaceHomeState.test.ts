import { describe, expect, it } from 'vitest';
import {
  deriveMarketplaceHomeState,
  type MarketplaceHomeStateInput,
} from '../../utils/marketplaceHomeState';

const base: MarketplaceHomeStateInput = {
  loading: false,
  fatalError: false,
  dataFailed: false,
  hasRenderableProducts: false,
  hasExplicitCuration: false,
};

describe('deriveMarketplaceHomeState', () => {
  it('reports loading regardless of other signals', () => {
    expect(
      deriveMarketplaceHomeState({
        ...base,
        loading: true,
        fatalError: true,
        dataFailed: true,
        hasRenderableProducts: true,
      })
    ).toBe('loading');
  });

  it('reports error when config is fatally broken and not loading', () => {
    expect(deriveMarketplaceHomeState({ ...base, fatalError: true })).toBe('error');
  });

  it('reports normal when products exist with explicit operator curation', () => {
    expect(
      deriveMarketplaceHomeState({
        ...base,
        hasRenderableProducts: true,
        hasExplicitCuration: true,
      })
    ).toBe('normal');
  });

  it('reports sparse when products exist but there is no explicit curation', () => {
    expect(deriveMarketplaceHomeState({ ...base, hasRenderableProducts: true })).toBe('sparse');
  });

  it('still shows products (sparse) even when a source also failed — partial success wins', () => {
    expect(
      deriveMarketplaceHomeState({
        ...base,
        hasRenderableProducts: true,
        dataFailed: true,
      })
    ).toBe('sparse');
  });

  it('reports degraded — NOT coldStart — when there are no products because a feed failed', () => {
    expect(deriveMarketplaceHomeState({ ...base, dataFailed: true })).toBe('degraded');
  });

  it('reports coldStart ONLY when everything succeeded and the shelf is genuinely empty', () => {
    expect(deriveMarketplaceHomeState({ ...base })).toBe('coldStart');
  });
});
