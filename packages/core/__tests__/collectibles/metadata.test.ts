import { describe, expect, it } from 'vitest';
import {
  buildCollectiblePurchaseItemPayload,
  collectibleOptionalFeature,
  purchaseItemOptionalFeaturesWithCollectibleMetadata,
} from '../../collectibles/metadata';
import {
  hasAuthoritativeCollectibleTitleMetadata,
  isCollectibleHubNftListing,
  parseCollectibleListingMetadata,
  resolveCollectibleListingCustodyKind,
} from '../../collectibles/listing';
import { buildCollectibleListingTagEntries } from '../../collectibles/listingTags';

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
      holderWallet: 'BuyerSol1111111111111111111111111111111',
    });
    expect(payload).toMatchObject({
      fulfillment: 'nft',
      hubSlotID: 'slot-1',
      nftMint: 'mint-abc',
      certNumber: 'PSA-123',
      holderWallet: 'BuyerSol1111111111111111111111111111111',
    });
    expect(payload.optionalFeatures).toEqual(
      expect.arrayContaining([
        'collectibles.fulfillment=nft',
        'collectibles.hub_slot_id=slot-1',
        'collectibles.nft_mint=mint-abc',
        'collectibles.cert_number=PSA-123',
        'collectibles.holder_wallet=BuyerSol1111111111111111111111111111111',
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

  it('parses grade, serial, and custody location tags', () => {
    const meta = parseCollectibleListingMetadata({
      metadata: { contractType: 'RWA_TOKEN' },
      item: {
        tags: [
          'collectibles:grade=PSA 10',
          'collectibles:serial=WILSON-001',
          'collectibles:hub_location=source-custody',
        ],
      },
    });
    expect(meta.grade).toBe('PSA 10');
    expect(meta.serial).toBe('WILSON-001');
    expect(resolveCollectibleListingCustodyKind(meta)).toBe('source');
  });

  it('reassembles chunked hub_slot_id and cert_number tags', () => {
    const hubSlotID = 'source_550e8400-e29b-41d4-a716-446655440000';
    const certNumber = 'PSA-1234567890123456789012345678901234567890';
    const tags = [
      'collectibles.fulfillment=nft',
      'collectibles.hub_location=source-custody',
      ...buildCollectibleListingTagEntries('hub_slot_id', hubSlotID),
      ...buildCollectibleListingTagEntries('cert_number', certNumber),
    ];

    const meta = parseCollectibleListingMetadata({
      metadata: { contractType: 'RWA_TOKEN' },
      item: { blockchain: 'solana', tags },
    });
    expect(meta.hubSlotID).toBe(hubSlotID);
    expect(meta.certNumber).toBe(certNumber);
    expect(
      hasAuthoritativeCollectibleTitleMetadata({
        metadata: { contractType: 'RWA_TOKEN' },
        item: { blockchain: 'solana', tags },
      })
    ).toBe(true);
  });

  it('requires authoritative tags before enabling digital-title UX', () => {
    const solanaOnly = {
      metadata: { contractType: 'RWA_TOKEN' },
      item: { blockchain: 'solana', tokenAddress: 'mint-1' },
    };
    expect(isCollectibleHubNftListing(solanaOnly)).toBe(true);
    expect(hasAuthoritativeCollectibleTitleMetadata(solanaOnly)).toBe(false);

    const authoritative = {
      metadata: { contractType: 'RWA_TOKEN' },
      item: {
        blockchain: 'solana',
        tags: [
          'collectibles:fulfillment=nft',
          'collectibles:cert_number=PSA-123',
          'collectibles:hub_slot_id=slot-1',
          'collectibles:hub_location=source-custody',
        ],
      },
    };
    expect(hasAuthoritativeCollectibleTitleMetadata(authoritative)).toBe(true);

    const missingHubSlot = {
      metadata: { contractType: 'RWA_TOKEN' },
      item: {
        blockchain: 'solana',
        tags: [
          'collectibles.fulfillment=nft',
          'collectibles.cert_number=PSA-123',
          'collectibles.hub_location=source-custody',
        ],
      },
    };
    expect(hasAuthoritativeCollectibleTitleMetadata(missingHubSlot)).toBe(false);

    const dotSpellingAuthoritative = {
      metadata: { contractType: 'RWA_TOKEN' },
      item: {
        blockchain: 'solana',
        tags: [
          'collectibles.fulfillment=nft',
          'collectibles.cert_number=PSA-123',
          'collectibles.hub_slot_id=slot-dot',
          'collectibles.hub_location=source-custody',
        ],
      },
    };
    expect(hasAuthoritativeCollectibleTitleMetadata(dotSpellingAuthoritative)).toBe(true);

    const physicalGood = {
      metadata: { contractType: 'PHYSICAL_GOOD' },
      item: { tags: ['collectibles:cert_number=PSA-123'] },
    };
    expect(hasAuthoritativeCollectibleTitleMetadata(physicalGood)).toBe(false);
  });
});
