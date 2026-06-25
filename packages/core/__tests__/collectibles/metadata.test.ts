import { describe, expect, it } from 'vitest';
import {
  buildCollectiblePurchaseItemPayload,
  collectibleOptionalFeature,
  purchaseItemOptionalFeaturesWithCollectibleMetadata,
} from '../../collectibles/metadata';
import {
  isCollectibleHubNftListing,
  parseCollectibleListingMetadata,
} from '../../collectibles/listing';

describe('collectibles metadata', () => {
  it('builds canonical optional feature entries', () => {
    expect(collectibleOptionalFeature('hub_slot_id', 'slot-1')).toBe(
      'collectibles.hub_slot_id=slot-1'
    );
  });

  it('merges explicit purchase fields without duplicating keys', () => {
    const features = purchaseItemOptionalFeaturesWithCollectibleMetadata({
      optionalFeatures: ['collectibles.hub_slot_id=slot-existing'],
      hubSlotID: 'slot-new',
      fulfillment: 'nft',
      nftMint: 'mint-1',
    });
    expect(features).toContain('collectibles.hub_slot_id=slot-existing');
    expect(features).toContain('collectibles.fulfillment=nft');
    expect(features).toContain('collectibles.nft_mint=mint-1');
    expect(features.filter(f => f.includes('hub_slot_id'))).toHaveLength(1);
  });

  it('maps purchase payload for Node API', () => {
    const payload = buildCollectiblePurchaseItemPayload({
      fulfillment: 'nft',
      hubSlotID: 'slot-1',
      nftMint: 'mint-abc',
      certNumber: 'PSA-123',
    });
    expect(payload).toMatchObject({
      fulfillment: 'nft',
      hubSlotID: 'slot-1',
      nftMint: 'mint-abc',
      certNumber: 'PSA-123',
    });
    expect(payload.optionalFeatures).toEqual(
      expect.arrayContaining([
        'collectibles.fulfillment=nft',
        'collectibles.hub_slot_id=slot-1',
        'collectibles.nft_mint=mint-abc',
        'collectibles.cert_number=PSA-123',
      ])
    );
  });
});

describe('collectibles listing helpers', () => {
  it('detects Solana hub NFT listings', () => {
    expect(
      isCollectibleHubNftListing({
        metadata: { contractType: 'RWA_TOKEN' },
        item: { blockchain: 'solana', tokenAddress: 'mint-1' },
      })
    ).toBe(true);
  });

  it('parses listing tags and token address', () => {
    const meta = parseCollectibleListingMetadata({
      metadata: { contractType: 'RWA_TOKEN' },
      item: {
        tokenAddress: 'mint-from-listing',
        tags: ['collectibles:hub_slot_id=slot-9', 'collectibles:cert_number=PSA-9'],
      },
    });
    expect(meta.hubSlotID).toBe('slot-9');
    expect(meta.nftMint).toBe('mint-from-listing');
    expect(meta.certNumber).toBe('PSA-9');
    expect(meta.fulfillment).toBe('nft');
  });
});
