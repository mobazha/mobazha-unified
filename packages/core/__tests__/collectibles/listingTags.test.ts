import { describe, expect, it } from 'vitest';
import {
  buildCollectibleListingTagEntries,
  buildLegacyLongCollectibleListingTagEntries,
  filterPublicProductDisplayTags,
  isCollectibleListingReservedTag,
} from '../../collectibles/listingTags';
import { resolveCollectibleTitleNetworkLabel } from '../../collectibles/listing';

describe('isCollectibleListingReservedTag', () => {
  it('matches canonical collectibles.* metadata tags', () => {
    expect(isCollectibleListingReservedTag('collectibles.fulfillment=nft')).toBe(true);
    expect(isCollectibleListingReservedTag('collectibles.hub_location=source-custody')).toBe(true);
    expect(isCollectibleListingReservedTag('collectibles.grade=PSA 10')).toBe(true);
  });

  it('matches compact c.hs@ / c.cn@ chunk tags and legacy chunked forms', () => {
    const hubTags = buildCollectibleListingTagEntries(
      'hub_slot_id',
      'source_550e8400-e29b-41d4-a716-446655440000'
    );
    const certTags = buildCollectibleListingTagEntries(
      'cert_number',
      'PSA-1234567890123456789012345678901234567890'
    );
    expect(hubTags.every(isCollectibleListingReservedTag)).toBe(true);
    expect(certTags.every(isCollectibleListingReservedTag)).toBe(true);

    const legacyTags = buildLegacyLongCollectibleListingTagEntries(
      'hub_slot_id',
      'source_550e8400-e29b-41d4-a716-446655440000'
    );
    expect(legacyTags.every(isCollectibleListingReservedTag)).toBe(true);
  });

  it('matches collectibles: colon-encoded tags', () => {
    expect(isCollectibleListingReservedTag('collectibles:fulfillment=nft')).toBe(true);
  });

  it('does not match buyer-facing discovery tags', () => {
    expect(isCollectibleListingReservedTag('m2-wilson')).toBe(false);
    expect(isCollectibleListingReservedTag('graded-card')).toBe(false);
    expect(isCollectibleListingReservedTag('testnet')).toBe(false);
    expect(isCollectibleListingReservedTag('mtg')).toBe(false);
  });
});

describe('filterPublicProductDisplayTags', () => {
  it('keeps discovery tags and removes reserved collectible metadata', () => {
    const hubTags = buildCollectibleListingTagEntries(
      'hub_slot_id',
      'source_550e8400-e29b-41d4-a716-446655440000'
    );
    const certTags = buildCollectibleListingTagEntries('cert_number', 'PSA-1234567890');

    const filtered = filterPublicProductDisplayTags([
      'm2-wilson',
      'graded-card',
      'testnet',
      'mtg',
      'collectibles.fulfillment=nft',
      'collectibles.hub_location=source-custody',
      'collectibles.grade=PSA 10',
      ...hubTags,
      ...certTags,
    ]);

    expect(filtered).toEqual(['m2-wilson', 'graded-card', 'testnet', 'mtg']);
  });
});

describe('resolveCollectibleTitleNetworkLabel', () => {
  it('maps listing blockchain solana to Solana', () => {
    expect(resolveCollectibleTitleNetworkLabel('solana')).toBe('Solana');
    expect(resolveCollectibleTitleNetworkLabel('SOL')).toBe('Solana');
  });
});
