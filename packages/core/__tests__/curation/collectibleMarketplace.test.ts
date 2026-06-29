import { describe, expect, it } from 'vitest';
import {
  appendCollectibleAttributionToHref,
  COLLECTIBLE_DEMO_DEAD_PLACEHOLDER_CID,
  collectibleListingMatchesCategoryFilter,
  filterCollectibleListingPreviews,
  getCollectibleDemoCardImageUrl,
  isCollectibleDemoCardImageUrl,
  isCollectibleDemoDeadPlaceholderImageUrl,
  parseCollectibleAttributionFromSearchParams,
  resolveCollectibleListingImageUrl,
  sanitizeCollectibleAttributionValue,
} from '../../curation/collectibleMarketplace';

describe('collectibleListingMatchesCategoryFilter', () => {
  it('matches sports from title and tags', () => {
    expect(
      collectibleListingMatchesCategoryFilter({ title: '2020 Topps Chrome Mike Trout' }, 'sports')
    ).toBe(true);
    expect(
      collectibleListingMatchesCategoryFilter(
        { title: 'Graded card', tags: ['baseball', 'psa'] },
        'sports'
      )
    ).toBe(true);
  });

  it('matches pokemon and mtg independently', () => {
    expect(
      collectibleListingMatchesCategoryFilter({ title: 'Pikachu VMAX PSA 10' }, 'pokemon')
    ).toBe(true);
    expect(
      collectibleListingMatchesCategoryFilter(
        { title: 'Black Lotus', categories: ['Magic: The Gathering'] },
        'mtg'
      )
    ).toBe(true);
  });

  it('matches other tcg without sports/pokemon/mtg overlap', () => {
    expect(
      collectibleListingMatchesCategoryFilter({ title: 'Yu-Gi-Oh Dark Magician' }, 'tcg')
    ).toBe(true);
    expect(
      collectibleListingMatchesCategoryFilter({ title: 'Charizard V', tags: ['pokemon'] }, 'tcg')
    ).toBe(false);
  });

  it('is case insensitive across categories, tags, and title', () => {
    expect(
      collectibleListingMatchesCategoryFilter(
        { title: 'Card', categories: ['POKEMON'], tags: ['TCG'] },
        'pokemon'
      )
    ).toBe(true);
  });

  it('returns all listings for the all filter', () => {
    const listings = [{ title: 'A' }, { title: 'B' }];
    expect(filterCollectibleListingPreviews(listings, 'all')).toEqual(listings);
  });
});

describe('collectible attribution helpers', () => {
  it('sanitizes invalid characters and truncates to 80 chars', () => {
    const noisy = 'card<script>alert(1)</script> promo';
    expect(sanitizeCollectibleAttributionValue(noisy)).toBe('cardscriptalert1script promo');
    expect(sanitizeCollectibleAttributionValue('a'.repeat(120))).toHaveLength(80);
  });

  it('parses only whitelisted params from search params', () => {
    const params = new URLSearchParams(
      'ref=card-drop&utm_source=newsletter&utm_medium=email&utm_campaign=spring&foo=bar'
    );
    expect(parseCollectibleAttributionFromSearchParams(params)).toEqual({
      ref: 'card-drop',
      utm_source: 'newsletter',
      utm_medium: 'email',
      utm_campaign: 'spring',
    });
  });

  it('appends only whitelisted params to product href', () => {
    const href = appendCollectibleAttributionToHref('/product/psa-charizard/QmSeller', {
      ref: 'wilson-cards',
      utm_source: 'marketplace',
      utm_medium: 'grid',
      utm_campaign: 'collectibles',
    });
    expect(href).toBe(
      '/product/psa-charizard/QmSeller?ref=wilson-cards&utm_source=marketplace&utm_medium=grid&utm_campaign=collectibles'
    );
  });

  it('preserves existing query params on href', () => {
    const href = appendCollectibleAttributionToHref('/product/slug/QmSeller?from=hub', {
      ref: 'card',
    });
    expect(href).toContain('from=hub');
    expect(href).toContain('ref=card');
  });
});

describe('collectible demo card image helpers', () => {
  it('returns bundled demo art only for exact known slugs', () => {
    expect(getCollectibleDemoCardImageUrl('m2-wilson-sports-card-demo-001-psa-10-testnet')).toBe(
      '/images/demo-cards/m2-wilson-sports-card-demo-001-psa-10-testnet.jpg'
    );
    expect(getCollectibleDemoCardImageUrl('unknown-slug')).toBeUndefined();
  });

  it('prefers API images and falls back to demo art', () => {
    expect(resolveCollectibleListingImageUrl('unknown-slug', '/v1/media/hash')).toBe(
      '/v1/media/hash'
    );
    expect(
      resolveCollectibleListingImageUrl('m2-wilson-pokemon-card-demo-002-psa-9-testnet', undefined)
    ).toBe('/images/demo-cards/m2-wilson-pokemon-card-demo-002-psa-9-testnet.jpg');
  });

  it('replaces dead demo placeholder API URLs with bundled art for known slugs', () => {
    const deadPlaceholderUrl = `/v1/media/images/${COLLECTIBLE_DEMO_DEAD_PLACEHOLDER_CID}`;
    expect(isCollectibleDemoDeadPlaceholderImageUrl(deadPlaceholderUrl)).toBe(true);
    expect(
      resolveCollectibleListingImageUrl(
        'm2-wilson-sports-card-demo-001-psa-10-testnet',
        deadPlaceholderUrl
      )
    ).toBe('/images/demo-cards/m2-wilson-sports-card-demo-001-psa-10-testnet.jpg');
  });

  it('keeps a different real API image for demo slugs', () => {
    const realApiImage = '/v1/media/images/QmRealWorkingImageHash123';
    expect(
      resolveCollectibleListingImageUrl('m2-wilson-mtg-card-demo-003-psa-10-testnet', realApiImage)
    ).toBe(realApiImage);
  });

  it('never assigns demo art to unknown slugs', () => {
    const deadPlaceholderUrl = `/v1/media/images/${COLLECTIBLE_DEMO_DEAD_PLACEHOLDER_CID}`;
    expect(resolveCollectibleListingImageUrl('unknown-slug', deadPlaceholderUrl)).toBe(
      deadPlaceholderUrl
    );
    expect(resolveCollectibleListingImageUrl('unknown-slug', undefined)).toBeUndefined();
  });

  it('detects bundled demo card URLs', () => {
    expect(isCollectibleDemoCardImageUrl('/images/demo-cards/foo.jpg')).toBe(true);
    expect(isCollectibleDemoCardImageUrl('/v1/media/hash')).toBe(false);
  });
});
