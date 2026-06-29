import { describe, expect, it } from 'vitest';
import {
  isSourceDepositListingReady,
  isSourceDepositMintEligible,
  isSourceDepositRecordFirstSaleEligible,
  isSourceDepositReviewPending,
  isValidCollectibleEvidenceUrl,
  parseCollectibleSourceDepositPhotosJSON,
  resolveSourceDepositLifecycleStep,
  resolveSourceDepositNextActionKey,
  resolveSourceDepositOperatorNextActionKey,
  resolveSourceDepositDefaultRefundStatusKey,
  resolveSourceDepositDefaultActionOutcome,
  isSourceDepositMarkDefaultEligible,
  isSourceDepositDefaultRefundRefreshEligible,
  isSourceDepositDefaultRefundRetryEligible,
  resolveSourceDepositRejectionReason,
  resolveSourceDepositStatusKey,
  validateCollectibleSourceDepositSubmission,
  collectibleHolderMatchesWallet,
  buildSourceDepositListingUrl,
  buildSourceDepositListingFormPrefill,
  buildSourceDepositListingTags,
  buildCollectibleListingTagEntries,
  parseSourceDepositListingSearchParams,
  isSourceDepositListingMode,
  getSourceDepositLockedTags,
  SOURCE_CUSTODY_LISTING_CRYPTO_CODE,
} from '../../collectibles/sourceDeposit';
import {
  buildLegacyLongCollectibleListingTagEntries,
  COLLECTIBLE_LISTING_TAG_MAX_COUNT,
  COLLECTIBLE_LISTING_TAG_MAX_LEN,
  parseCollectibleListingTagMap,
} from '../../collectibles/listingTags';
import {
  hasAuthoritativeCollectibleTitleMetadata,
  parseCollectibleListingMetadata,
} from '../../collectibles/listing';

describe('sourceDeposit helpers', () => {
  it('maps seller-facing status and next-action keys', () => {
    expect(resolveSourceDepositStatusKey('submitted')).toBe(
      'collectibles.sourceDeposit.status.submitted'
    );
    expect(resolveSourceDepositNextActionKey({ status: 'source_held' })).toBe(
      'collectibles.sourceDeposit.nextAction.sourceHeld'
    );
  });

  it('does not allow pre-sale mint at source_held without a recorded first sale', () => {
    expect(isSourceDepositMintEligible({ status: 'submitted' })).toBe(false);
    expect(isSourceDepositMintEligible({ status: 'source_held' })).toBe(false);
    expect(
      isSourceDepositMintEligible({
        status: 'source_held',
        firstSaleOrderID: 'order-1',
        nftMint: undefined,
      })
    ).toBe(true);
    expect(
      isSourceDepositMintEligible({
        status: 'source_held',
        firstSaleOrderID: 'order-1',
        nftMint: 'mint-1',
      })
    ).toBe(false);
    expect(isSourceDepositMintEligible({ status: 'minting' })).toBe(true);
    expect(isSourceDepositListingReady({ status: 'source_held' })).toBe(true);
    expect(isSourceDepositReviewPending({ status: 'submitted' })).toBe(true);
  });

  it('allows manual record-first-sale recovery only for source_held without an order', () => {
    expect(
      isSourceDepositRecordFirstSaleEligible({ status: 'source_held', firstSaleOrderID: undefined })
    ).toBe(true);
    expect(
      isSourceDepositRecordFirstSaleEligible({ status: 'source_held', firstSaleOrderID: 'order-1' })
    ).toBe(false);
    expect(
      isSourceDepositRecordFirstSaleEligible({ status: 'minted', firstSaleOrderID: undefined })
    ).toBe(false);
  });

  it('maps operator next actions across lifecycle', () => {
    expect(resolveSourceDepositOperatorNextActionKey({ status: 'submitted' })).toBe(
      'collectibles.sourceDeposit.operatorNext.review'
    );
    expect(
      resolveSourceDepositOperatorNextActionKey({ status: 'source_held', nftMint: 'mint-1' })
    ).toBe('collectibles.sourceDeposit.operatorNext.awaitingListing');
    expect(
      resolveSourceDepositOperatorNextActionKey({
        status: 'source_held',
        firstSaleOrderID: 'order-1',
        nftMint: undefined,
      })
    ).toBe('collectibles.sourceDeposit.operatorNext.mint');
    expect(
      resolveSourceDepositOperatorNextActionKey({
        status: 'minted',
        firstSaleOrderID: undefined,
        nftMint: 'mint-1',
      })
    ).toBe('collectibles.sourceDeposit.operatorNext.firstSale');
  });

  it('maps default refund status and operator actions', () => {
    expect(resolveSourceDepositDefaultRefundStatusKey('pending')).toBe(
      'collectibles.sourceDeposit.defaultRefund.status.pending'
    );
    expect(resolveSourceDepositDefaultRefundStatusKey('refunded')).toBe(
      'collectibles.sourceDeposit.defaultRefund.status.refunded'
    );
    expect(resolveSourceDepositDefaultRefundStatusKey('failed')).toBe(
      'collectibles.sourceDeposit.defaultRefund.status.failed'
    );
    expect(resolveSourceDepositDefaultRefundStatusKey(undefined)).toBeNull();

    expect(
      resolveSourceDepositOperatorNextActionKey({
        status: 'redeem_requested',
        defaultRefundStatus: 'pending',
      })
    ).toBe('collectibles.sourceDeposit.operatorNext.defaultRefundPending');
    expect(
      resolveSourceDepositOperatorNextActionKey({
        status: 'in_circulation',
        defaultRefundStatus: 'failed',
      })
    ).toBe('collectibles.sourceDeposit.operatorNext.defaultRefundFailed');
    expect(
      resolveSourceDepositOperatorNextActionKey({
        status: 'defaulted',
        defaultRefundStatus: 'pending',
      })
    ).toBe('collectibles.sourceDeposit.operatorNext.complete');

    expect(
      isSourceDepositMarkDefaultEligible({
        status: 'redeem_requested',
        defaultRefundStatus: 'pending',
      })
    ).toBe(false);
    expect(
      isSourceDepositMarkDefaultEligible({
        status: 'redeem_requested',
        defaultRefundStatus: 'failed',
      })
    ).toBe(false);
    expect(
      isSourceDepositDefaultRefundRefreshEligible({
        status: 'redeem_requested',
        defaultRefundStatus: 'pending',
      })
    ).toBe(true);
    expect(
      isSourceDepositDefaultRefundRetryEligible({
        status: 'redeem_requested',
        defaultRefundStatus: 'failed',
      })
    ).toBe(true);

    expect(
      resolveSourceDepositDefaultActionOutcome({
        status: 'redeem_requested',
        defaultRefundStatus: 'pending',
      })
    ).toBe('refundPending');
    expect(
      resolveSourceDepositDefaultActionOutcome({
        status: 'defaulted',
        defaultRefundStatus: 'pending',
      })
    ).toBe('defaulted');
    expect(
      resolveSourceDepositDefaultActionOutcome({
        status: 'redeem_requested',
        defaultRefundStatus: 'refunded',
      })
    ).toBe('defaulted');
    expect(
      resolveSourceDepositDefaultActionOutcome({
        status: 'redeem_requested',
        defaultRefundStatus: 'failed',
      })
    ).toBe('refundFailed');
  });

  it('parses photosJSON evidence safely with front/back labels', () => {
    expect(parseCollectibleSourceDepositPhotosJSON(undefined)).toEqual([]);
    expect(parseCollectibleSourceDepositPhotosJSON('not-json')).toEqual([]);
    expect(parseCollectibleSourceDepositPhotosJSON('{"front":"x"}')).toEqual([]);
    expect(
      parseCollectibleSourceDepositPhotosJSON(
        JSON.stringify([
          'https://example.com/front.jpg',
          'ftp://bad.example/back.jpg',
          'https://example.com/extra.jpg',
        ])
      )
    ).toEqual([{ side: 'front', url: 'https://example.com/front.jpg' }]);
    expect(
      parseCollectibleSourceDepositPhotosJSON(
        JSON.stringify(['https://example.com/front.jpg', 'https://example.com/back.jpg'])
      )
    ).toEqual([
      { side: 'front', url: 'https://example.com/front.jpg' },
      { side: 'back', url: 'https://example.com/back.jpg' },
    ]);
  });

  it('maps lifecycle steps for seller UI', () => {
    expect(resolveSourceDepositLifecycleStep({ status: 'submitted' })).toBe('review');
    expect(resolveSourceDepositLifecycleStep({ status: 'source_held' })).toBe('list');
    expect(resolveSourceDepositLifecycleStep({ status: 'in_circulation' })).toBe('listed');
    expect(resolveSourceDepositLifecycleStep({ status: 'redeem_requested' })).toBe('redeem');
  });

  it('resolves rejection reason with rejected fallback', () => {
    expect(
      resolveSourceDepositRejectionReason({
        status: 'rejected',
        rejectionReason: 'Bad photos',
      })
    ).toBe('Bad photos');
    expect(
      resolveSourceDepositRejectionReason({
        status: 'rejected',
        rejectionReason: '',
        defaultReason: 'Did not meet grading policy',
      })
    ).toBe('Did not meet grading policy');
    expect(
      resolveSourceDepositRejectionReason({
        status: 'submitted',
        defaultReason: 'Should not show',
      })
    ).toBeUndefined();
  });

  it('validates submission evidence URLs', () => {
    expect(isValidCollectibleEvidenceUrl('https://example.com/front.jpg')).toBe(true);
    expect(isValidCollectibleEvidenceUrl('ftp://example.com/front.jpg')).toBe(false);

    expect(
      validateCollectibleSourceDepositSubmission({
        certNumber: 'PSA-1',
        grade: '10',
        holderWallet: 'wallet-1',
        photoFrontUrl: 'https://example.com/front.jpg',
        photoBackUrl: 'https://example.com/back.jpg',
      }).valid
    ).toBe(true);

    const invalid = validateCollectibleSourceDepositSubmission({
      certNumber: '',
      grade: '',
      holderWallet: '',
      photoFrontUrl: 'not-a-url',
      photoBackUrl: 'https://example.com/front.jpg',
    });
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.certNumber).toBe(true);
    expect(invalid.errors.grade).toBe(true);
    expect(invalid.errors.photoFrontUrl).toBe(true);

    const sameUrl = validateCollectibleSourceDepositSubmission({
      certNumber: 'PSA-1',
      grade: '10',
      holderWallet: 'wallet-1',
      photoFrontUrl: 'https://example.com/same.jpg',
      photoBackUrl: 'https://example.com/same.jpg',
    });
    expect(sameUrl.valid).toBe(false);
    expect(sameUrl.errors.photosDistinct).toBe(true);
  });

  it('matches wallet holders with trim-only comparison for Solana Base58', () => {
    const solanaAddress = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
    expect(collectibleHolderMatchesWallet(`  ${solanaAddress}  `, solanaAddress)).toBe(true);
    expect(collectibleHolderMatchesWallet(solanaAddress, ` ${solanaAddress}\n`)).toBe(true);
    expect(collectibleHolderMatchesWallet(solanaAddress, solanaAddress.toLowerCase())).toBe(false);
    expect(collectibleHolderMatchesWallet('holder', undefined)).toBe(false);
    expect(collectibleHolderMatchesWallet(undefined, 'wallet')).toBe(false);
    expect(collectibleHolderMatchesWallet('', 'wallet')).toBe(false);
  });

  it('builds source-deposit listing URL with encoded prefill params', () => {
    const url = buildSourceDepositListingUrl({
      sourceDepositID: 'dep-held',
      hubSlotID: 'slot-1',
      certNumber: 'PSA-9',
      grade: '10',
      serial: 'WILSON-001',
    });
    expect(url).toContain('/listing/new?');
    expect(url).toContain('sourceDepositID=dep-held');
    expect(url).toContain('certNumber=PSA-9');
    expect(url).toContain('hubSlotID=slot-1');
    expect(url).toContain('grade=10');
    expect(url).toContain('serial=WILSON-001');
  });

  it('parses source-deposit listing search params strictly', () => {
    const params = new URLSearchParams(
      'sourceDepositID=dep-1&certNumber=PSA-1&hubSlotID=slot-9&grade=10'
    );
    expect(parseSourceDepositListingSearchParams(params)).toEqual({
      sourceDepositID: 'dep-1',
      certNumber: 'PSA-1',
      hubSlotID: 'slot-9',
      grade: '10',
    });
    expect(parseSourceDepositListingSearchParams(new URLSearchParams('sourceDepositID=only'))).toBe(
      null
    );
    expect(
      parseSourceDepositListingSearchParams(
        new URLSearchParams('sourceDepositID=dep-1&certNumber=PSA-1')
      )
    ).toBe(null);
    expect(isSourceDepositListingMode(params)).toBe(true);
  });

  it('builds authoritative listing prefill without token mint', () => {
    const prefill = buildSourceDepositListingFormPrefill({
      sourceDepositID: 'dep-1',
      hubSlotID: 'slot-9',
      certNumber: 'PSA-123',
      grade: 'PSA 10',
      serial: '001',
    });
    expect(prefill.contractType).toBe('RWA_TOKEN');
    expect(prefill.blockchain).toBe('SOL');
    expect(prefill.tokenStandard).toBe('metaplex_pnft');
    expect(prefill.minQuantity).toBe(1);
    expect(prefill.maxQuantity).toBe(1);
    expect(prefill.tokenAddress).toBe('');
    expect(prefill.cryptoListingCurrencyCode).toBe(SOURCE_CUSTODY_LISTING_CRYPTO_CODE);
    expect(prefill.tags).toEqual(
      expect.arrayContaining([
        'collectibles.fulfillment=nft',
        'collectibles.hub_slot_id=slot-9',
        'collectibles.cert_number=PSA-123',
        'collectibles.hub_location=source-custody',
        'collectibles.grade=PSA 10',
        'collectibles.serial=001',
        'collectible-card',
      ])
    );
    expect(
      getSourceDepositLockedTags({
        sourceDepositID: 'dep-1',
        hubSlotID: 'slot-9',
        certNumber: 'PSA-123',
        grade: 'PSA 10',
        serial: '001',
      })
    ).toEqual(
      buildSourceDepositListingTags({
        sourceDepositID: 'dep-1',
        hubSlotID: 'slot-9',
        certNumber: 'PSA-123',
        grade: 'PSA 10',
        serial: '001',
      })
    );
  });

  it('keeps short values as canonical collectibles.<key>=<value> tags', () => {
    expect(buildCollectibleListingTagEntries('hub_slot_id', 'slot-9')).toEqual([
      'collectibles.hub_slot_id=slot-9',
    ]);
    expect(buildCollectibleListingTagEntries('cert_number', 'PSA-123')).toEqual([
      'collectibles.cert_number=PSA-123',
    ]);
  });

  it('chunks long hub_slot_id and cert_number with compact c.<alias>@ tags', () => {
    const hubSlotID = 'source_550e8400-e29b-41d4-a716-446655440000';
    const certNumber = 'PSA-1234567890123456789012345678901234567890';

    const hubTags = buildCollectibleListingTagEntries('hub_slot_id', hubSlotID);
    const certTags = buildCollectibleListingTagEntries('cert_number', certNumber);

    expect(hubTags.length).toBeGreaterThan(1);
    expect(certTags.length).toBeGreaterThan(1);
    expect(hubTags.every(tag => tag.length <= COLLECTIBLE_LISTING_TAG_MAX_LEN)).toBe(true);
    expect(certTags.every(tag => tag.length <= COLLECTIBLE_LISTING_TAG_MAX_LEN)).toBe(true);
    expect(hubTags.every(tag => tag.startsWith('c.hs@'))).toBe(true);
    expect(certTags.every(tag => tag.startsWith('c.cn@'))).toBe(true);

    const tagsAgain = buildCollectibleListingTagEntries('hub_slot_id', hubSlotID);
    expect(tagsAgain).toEqual(hubTags);

    const listingTags = buildSourceDepositListingTags({
      sourceDepositID: 'dep-long',
      hubSlotID,
      certNumber,
      grade: 'PSA 10',
      serial: '001',
    });

    expect(listingTags.length).toBeLessThanOrEqual(COLLECTIBLE_LISTING_TAG_MAX_COUNT);
    expect(listingTags.every(tag => tag.length <= COLLECTIBLE_LISTING_TAG_MAX_LEN)).toBe(true);
    expect(listingTags).toContain('collectibles.fulfillment=nft');
    expect(listingTags).toContain('collectibles.hub_location=source-custody');
    expect(listingTags).toContain('collectibles.grade=PSA 10');
    expect(listingTags).toContain('collectibles.serial=001');
    expect(listingTags.filter(tag => tag.startsWith('c.hs@'))).toEqual(hubTags);
    expect(listingTags.filter(tag => tag.startsWith('c.cn@'))).toEqual(certTags);

    const hubIndex = listingTags.findIndex(tag => tag.startsWith('c.hs@'));
    const certIndex = listingTags.findIndex(tag => tag.startsWith('c.cn@'));
    expect(hubIndex).toBeLessThan(certIndex);
  });

  it('reassembles chunked source-deposit tags for authoritative listing gate', () => {
    const hubSlotID = 'source_550e8400-e29b-41d4-a716-446655440000';
    const certNumber = 'PSA-1234567890123456789012345678901234567890';
    const tags = buildSourceDepositListingTags({
      sourceDepositID: 'dep-long',
      hubSlotID,
      certNumber,
    });

    const meta = parseCollectibleListingMetadata({
      metadata: { contractType: 'RWA_TOKEN' },
      item: { blockchain: 'solana', tags },
    });
    expect(meta.hubSlotID).toBe(hubSlotID);
    expect(meta.certNumber).toBe(certNumber);
    expect(meta.fulfillment).toBe('nft');
    expect(meta.hubLocation).toBe('source-custody');

    expect(
      hasAuthoritativeCollectibleTitleMetadata({
        metadata: { contractType: 'RWA_TOKEN' },
        item: { blockchain: 'solana', tags },
      })
    ).toBe(true);

    const colonTags = tags.map(tag =>
      tag.startsWith('collectibles.') ? `collectibles:${tag.slice('collectibles.'.length)}` : tag
    );
    const colonMeta = parseCollectibleListingMetadata({
      metadata: { contractType: 'RWA_TOKEN' },
      item: { blockchain: 'solana', tags: colonTags },
    });
    expect(colonMeta.hubSlotID).toBe(hubSlotID);
    expect(colonMeta.certNumber).toBe(certNumber);
  });

  it('drops optional discoverability tags when the 10-tag budget is full', () => {
    const hubSlotID = 'source_550e8400-e29b-41d4-a716-446655440000';
    const certNumber = 'PSA-1234567890123456789012345678901234567890';

    const listingTags = buildSourceDepositListingTags({
      sourceDepositID: 'dep-long',
      hubSlotID,
      certNumber,
      grade: 'PSA 10',
      serial: '001',
    });

    expect(listingTags.length).toBe(COLLECTIBLE_LISTING_TAG_MAX_COUNT);
    expect(listingTags).toContain('collectibles.grade=PSA 10');
    expect(listingTags).toContain('collectibles.serial=001');
    expect(listingTags).not.toContain('trading-cards');
  });

  it('throws when required authoritative tags exceed the 10-tag OpenBazaar limit', () => {
    const hubSlotID = 'source_' + 'a'.repeat(220);
    const certNumber = 'PSA-' + '9'.repeat(220);

    expect(() =>
      buildSourceDepositListingTags({
        sourceDepositID: 'dep-overflow',
        hubSlotID,
        certNumber,
      })
    ).toThrow(/exceed OpenBazaar limit of 10/);
  });

  it('reads legacy collectibles:, canonical, long, and compact chunk formats', () => {
    const hubSlotID = 'source_550e8400-e29b-41d4-a716-446655440000';
    const certNumber = 'PSA-1234567890123456789012345678901234567890';

    const legacyColon = parseCollectibleListingTagMap([
      'collectibles:fulfillment=nft',
      'collectibles:hub_location=source-custody',
      'collectibles:hub_slot_id=slot-legacy',
      'collectibles:cert_number=PSA-legacy',
    ]);
    expect(legacyColon.fulfillment).toBe('nft');
    expect(legacyColon.hub_slot_id).toBe('slot-legacy');

    const longChunks = [
      'collectibles.fulfillment=nft',
      'collectibles.hub_location=source-custody',
      ...buildLegacyLongCollectibleListingTagEntries('hub_slot_id', hubSlotID),
      ...buildLegacyLongCollectibleListingTagEntries('cert_number', certNumber),
    ];
    expect(parseCollectibleListingTagMap(longChunks).hub_slot_id).toBe(hubSlotID);
    expect(parseCollectibleListingTagMap(longChunks).cert_number).toBe(certNumber);

    const compactChunks = buildSourceDepositListingTags({
      sourceDepositID: 'dep-long',
      hubSlotID,
      certNumber,
    });
    expect(parseCollectibleListingTagMap(compactChunks).hub_slot_id).toBe(hubSlotID);
    expect(parseCollectibleListingTagMap(compactChunks).cert_number).toBe(certNumber);
  });
});
