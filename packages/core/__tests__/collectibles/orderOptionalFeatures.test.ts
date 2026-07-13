// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it } from 'vitest';
import {
  appendOrderOptionalFeaturesToSearchParams,
  COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS,
  COLLECTIBLE_ZERO_ORDER_FEATURE_SURCHARGE,
  orderOptionalFeaturesToSignedListingEntries,
  readCollectibleSignedOrderOptionalFeatures,
  readOrderOptionalFeaturesFromSearchParams,
  sortCollectibleOrderOptionalFeatures,
  validateCollectibleOrderOptionalFeatures,
  validateOrderItemCollateralProjectionFeatures,
} from '../../collectibles/orderOptionalFeatures';
import {
  buildSourceDepositListingTags,
  buildSourceDepositListingUrl,
  parseSourceDepositListingSearchParams,
  resolveSourceDepositListingUrlState,
  validateSourceDepositListingBindings,
} from '../../collectibles/sourceDeposit';
import { COLLECTIBLE_LISTING_TAG_MAX_COUNT } from '../../collectibles/listingTags';
import {
  hasAuthoritativeCollectibleTitleMetadata,
  parseCollectibleListingMetadata,
} from '../../collectibles/listing';
import { buildCollectiblePurchaseItemPayload } from '../../collectibles/metadata';
import {
  COLLECTIBLES_SOURCE_CUSTODY_POLICY_ID,
  COLLECTIBLES_SOURCE_CUSTODY_POLICY_VERSION,
} from '../../collateral/constants';

const evmAssetID = 'crypto:eip155:56:erc20:0x0000000000000000000000000000000000000001';
const solanaHolderWallet = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';

const collateralFeatures = [
  `collectibles.${COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.sourceDepositId}=dep-1`,
  `collectibles.${COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralAssetId}=${evmAssetID}`,
  `collectibles.${COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralAmount}=100`,
  `collectibles.${COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralPolicyId}=${COLLECTIBLES_SOURCE_CUSTODY_POLICY_ID}`,
  `collectibles.${COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralPolicyVersion}=${COLLECTIBLES_SOURCE_CUSTODY_POLICY_VERSION}`,
  `collectibles.${COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.hubSlotId}=slot-1`,
  `collectibles.${COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.certNumber}=PSA-9`,
  `collectibles.${COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.holderWallet}=${solanaHolderWallet}`,
];

function signedListingEntries(features: readonly string[]) {
  return orderOptionalFeaturesToSignedListingEntries(features);
}

describe('collectible order optional features', () => {
  it('validates order-item collateral projection independently of duplicate non-collateral keys', () => {
    const sellerWallet = 'SellerSol111111111111111111111111111111';
    const buyerWallet = 'BuyerSol1111111111111111111111111111111';
    const features = [
      `collectibles.${COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.fulfillment}=nft`,
      `collectibles.${COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.fulfillment}=ship-from-hub`,
      `collectibles.${COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.holderWallet}=${sellerWallet}`,
      `collectibles.${COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.holderWallet}=${buyerWallet}`,
      ...collateralFeatures,
    ];

    expect(validateCollectibleOrderOptionalFeatures(features)).toEqual({
      valid: false,
      issue: 'duplicateKey',
    });
    expect(validateOrderItemCollateralProjectionFeatures(features)).toEqual({
      status: 'valid',
      values: expect.any(Map),
    });
  });

  it('fails closed on duplicate conflicting collateral projection keys', () => {
    expect(
      validateOrderItemCollateralProjectionFeatures([
        ...collateralFeatures,
        `collectibles.${COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralAmount}=200`,
      ])
    ).toEqual({ status: 'invalid', issue: 'duplicateKey' });
  });

  it('fails closed on duplicate identical collateral projection keys', () => {
    expect(
      validateOrderItemCollateralProjectionFeatures([...collateralFeatures, collateralFeatures[0]!])
    ).toEqual({ status: 'invalid', issue: 'duplicateKey' });
  });

  it('validates a complete collateral feature set', () => {
    expect(
      validateCollectibleOrderOptionalFeatures(collateralFeatures, {
        sourceDepositID: 'dep-1',
        hubSlotID: 'slot-1',
        certNumber: 'PSA-9',
      })
    ).toEqual({ valid: true, features: expect.any(Array) });
  });

  it('fails closed on partial collateral features', () => {
    expect(
      validateCollectibleOrderOptionalFeatures(
        [`collectibles.${COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralAmount}=100`],
        { sourceDepositID: 'dep-1' }
      )
    ).toEqual({ valid: false, issue: 'partialCollateralSet' });
  });

  it('rejects source deposit binding mismatches', () => {
    expect(
      validateCollectibleOrderOptionalFeatures(collateralFeatures, {
        sourceDepositID: 'dep-other',
      })
    ).toEqual({ valid: false, issue: 'sourceDepositMismatch' });
  });

  it('requires source_deposit_id in the signed collateral feature set', () => {
    const withoutSourceDeposit = collateralFeatures.filter(
      feature => !feature.includes(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.sourceDepositId)
    );
    expect(
      validateCollectibleOrderOptionalFeatures(withoutSourceDeposit, {
        sourceDepositID: 'dep-1',
        hubSlotID: 'slot-1',
        certNumber: 'PSA-9',
      })
    ).toEqual({ valid: false, issue: 'partialCollateralSet' });
    expect(
      validateSourceDepositListingBindings({
        sourceDepositID: 'dep-1',
        hubSlotID: 'slot-1',
        certNumber: 'PSA-9',
        guaranteeAmount: '100',
        guaranteeCurrency: evmAssetID,
        orderOptionalFeatures: withoutSourceDeposit,
      })
    ).toEqual({ valid: false, issue: 'partialCollateralSet' });
  });

  it('fails closed when signed collateral policy id does not match source-custody constants', () => {
    const wrongPolicyId = collateralFeatures.map(feature =>
      feature.includes(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralPolicyId)
        ? `collectibles.${COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralPolicyId}=wrong-policy`
        : feature
    );
    expect(validateCollectibleOrderOptionalFeatures(wrongPolicyId)).toEqual({
      valid: false,
      issue: 'collateralPolicyIdMismatch',
    });
    expect(
      validateSourceDepositListingBindings({
        sourceDepositID: 'dep-1',
        hubSlotID: 'slot-1',
        certNumber: 'PSA-9',
        guaranteeAmount: '100',
        guaranteeCurrency: evmAssetID,
        orderOptionalFeatures: wrongPolicyId,
      })
    ).toEqual({ valid: false, issue: 'collateralPolicyIdMismatch' });
  });

  it('fails closed when signed collateral policy version does not match source-custody constants', () => {
    const wrongPolicyVersion = collateralFeatures.map(feature =>
      feature.includes(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralPolicyVersion)
        ? `collectibles.${COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralPolicyVersion}=2`
        : feature
    );
    expect(validateCollectibleOrderOptionalFeatures(wrongPolicyVersion)).toEqual({
      valid: false,
      issue: 'collateralPolicyVersionMismatch',
    });
    expect(
      validateSourceDepositListingBindings({
        sourceDepositID: 'dep-1',
        hubSlotID: 'slot-1',
        certNumber: 'PSA-9',
        guaranteeAmount: '100',
        guaranteeCurrency: evmAssetID,
        orderOptionalFeatures: wrongPolicyVersion,
      })
    ).toEqual({ valid: false, issue: 'collateralPolicyVersionMismatch' });
  });

  it('round-trips features through listing URL params', () => {
    const url = buildSourceDepositListingUrl({
      sourceDepositID: 'dep-1',
      hubSlotID: 'slot-1',
      certNumber: 'PSA-9',
      orderOptionalFeatures: collateralFeatures,
    });
    const query = new URL(url, 'http://localhost').searchParams;
    const state = resolveSourceDepositListingUrlState(query);
    expect(state.mode).toBe(true);
    if (state.mode) {
      expect(state.orderFeaturesIssue).toBeNull();
      expect(state.prefill?.orderOptionalFeatures).toEqual(
        sortCollectibleOrderOptionalFeatures(collateralFeatures)
      );
    }
    expect(parseSourceDepositListingSearchParams(query)?.orderOptionalFeatures).toEqual(
      sortCollectibleOrderOptionalFeatures(collateralFeatures)
    );
  });

  it('fails closed on malformed URL order features without dropping collateral bindings', () => {
    const params = new URLSearchParams('sourceDepositID=dep-1&certNumber=PSA-9&hubSlotID=slot-1');
    params.append(
      'orderFeature',
      `collectibles.${COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralAmount}=100`
    );
    const state = resolveSourceDepositListingUrlState(params);
    expect(state).toEqual({
      mode: true,
      prefill: null,
      orderFeaturesIssue: 'partialCollateralSet',
      partial: {
        sourceDepositID: 'dep-1',
        certNumber: 'PSA-9',
        hubSlotID: 'slot-1',
      },
    });
    expect(parseSourceDepositListingSearchParams(params)).toBeNull();
  });

  it('keeps realistic long EVM asset and Solana holder wallet in signed listing entries', () => {
    const longAsset = 'crypto:eip155:56:erc20:0x1234567890abcdef1234567890abcdef12345678';
    const features = collateralFeatures.map(feature =>
      feature.includes(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralAssetId)
        ? `collectibles.${COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralAssetId}=${longAsset}`
        : feature
    );
    const entries = signedListingEntries(features);
    expect(entries).toEqual(
      expect.arrayContaining([
        {
          name: expect.stringContaining(longAsset),
          surcharge: COLLECTIBLE_ZERO_ORDER_FEATURE_SURCHARGE,
        },
        {
          name: `collectibles.${COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.holderWallet}=${solanaHolderWallet}`,
          surcharge: COLLECTIBLE_ZERO_ORDER_FEATURE_SURCHARGE,
        },
      ])
    );
    for (const entry of entries) {
      expect(entry).not.toHaveProperty('description');
      expect(entry).not.toHaveProperty('price');
    }
  });

  it('serializes zero-surcharge signed listing optional feature entries', () => {
    const entries = signedListingEntries(collateralFeatures);
    expect(
      entries.every(
        entry =>
          entry.surcharge === COLLECTIBLE_ZERO_ORDER_FEATURE_SURCHARGE &&
          !('description' in entry) &&
          !('price' in entry)
      )
    ).toBe(true);
    expect(entries.map(entry => entry.name)).toEqual(
      expect.arrayContaining(sortCollectibleOrderOptionalFeatures(collateralFeatures))
    );
  });

  it('rejects non-canonical collateral asset IDs', () => {
    const invalidAssetFeatures = collateralFeatures.map(feature =>
      feature.includes(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralAssetId)
        ? `collectibles.${COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralAssetId}=crypto:not-a-real-asset`
        : feature
    );
    expect(validateCollectibleOrderOptionalFeatures(invalidAssetFeatures)).toEqual({
      valid: false,
      issue: 'invalidCollateralAsset',
    });
  });

  it('reads signed listing metadata and checkout payload from item.optionalFeatures', () => {
    const params = new URLSearchParams();
    appendOrderOptionalFeaturesToSearchParams(params, collateralFeatures);
    const parsed = readOrderOptionalFeaturesFromSearchParams(params);
    expect(parsed).toEqual(sortCollectibleOrderOptionalFeatures(collateralFeatures));

    const tags = buildSourceDepositListingTags({
      sourceDepositID: 'dep-1',
      hubSlotID: 'slot-1',
      certNumber: 'PSA-9',
      orderOptionalFeatures: collateralFeatures,
    });
    expect(tags.length).toBeLessThanOrEqual(COLLECTIBLE_LISTING_TAG_MAX_COUNT);
    expect(
      tags.some(tag => tag.includes(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralAssetId))
    ).toBe(false);

    const signedEntries = orderOptionalFeaturesToSignedListingEntries(collateralFeatures);
    const meta = parseCollectibleListingMetadata({
      metadata: { contractType: 'RWA_TOKEN' },
      item: {
        blockchain: 'solana',
        tags,
        optionalFeatures: signedEntries,
      },
    });
    expect(meta.orderOptionalFeaturesValid).toBe(true);
    expect(meta.orderOptionalFeatures).toEqual(
      sortCollectibleOrderOptionalFeatures(collateralFeatures)
    );

    const payload = buildCollectiblePurchaseItemPayload({
      fulfillment: meta.fulfillment,
      hubSlotID: meta.hubSlotID,
      certNumber: meta.certNumber,
      optionalFeatures: meta.orderOptionalFeatures,
    });
    expect(payload.optionalFeatures).toEqual(
      expect.arrayContaining(sortCollectibleOrderOptionalFeatures(collateralFeatures))
    );
  });

  it('fails closed when signed listing optional features are malformed', () => {
    const tags = buildSourceDepositListingTags({
      sourceDepositID: 'dep-1',
      hubSlotID: 'slot-1',
      certNumber: 'PSA-9',
    });
    const product = {
      metadata: { contractType: 'RWA_TOKEN' as const },
      item: {
        blockchain: 'solana',
        tags,
        optionalFeatures: [
          {
            name: `collectibles.${COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralAmount}=100`,
            surcharge: COLLECTIBLE_ZERO_ORDER_FEATURE_SURCHARGE,
          },
        ],
      },
    };
    const meta = parseCollectibleListingMetadata(product);
    expect(meta.orderOptionalFeaturesValid).toBe(false);
    expect(meta.orderOptionalFeatures).toBeUndefined();
    expect(hasAuthoritativeCollectibleTitleMetadata(product)).toBe(false);
    expect(
      readCollectibleSignedOrderOptionalFeatures(product.item.optionalFeatures, {
        hubSlotID: 'slot-1',
        certNumber: 'PSA-9',
      })
    ).toEqual({ valid: false, issue: 'partialCollateralSet' });
  });

  it('fails closed when guarantee is declared but signed bindings are missing', () => {
    expect(
      validateSourceDepositListingBindings({
        sourceDepositID: 'dep-1',
        hubSlotID: 'slot-1',
        certNumber: 'PSA-9',
        guaranteeAmount: '100',
        guaranteeCurrency: evmAssetID,
      })
    ).toEqual({ valid: false, issue: 'missingCollateralBindings' });

    const params = new URLSearchParams(
      `sourceDepositID=dep-1&certNumber=PSA-9&hubSlotID=slot-1&guaranteeAmount=100&guaranteeCurrency=${encodeURIComponent(evmAssetID)}`
    );
    expect(resolveSourceDepositListingUrlState(params)).toEqual({
      mode: true,
      prefill: null,
      orderFeaturesIssue: 'missingCollateralBindings',
      partial: {
        sourceDepositID: 'dep-1',
        certNumber: 'PSA-9',
        hubSlotID: 'slot-1',
      },
    });
    expect(parseSourceDepositListingSearchParams(params)).toBeNull();
  });

  it('never treats partial or invalid guarantee declarations as unsecured', () => {
    expect(
      validateSourceDepositListingBindings({
        sourceDepositID: 'dep-1',
        hubSlotID: 'slot-1',
        certNumber: 'PSA-9',
        guaranteeAmount: '100',
        guaranteeCurrency: '',
      })
    ).toEqual({ valid: false, issue: 'invalidGuaranteeAsset' });

    expect(
      validateSourceDepositListingBindings({
        sourceDepositID: 'dep-1',
        hubSlotID: 'slot-1',
        certNumber: 'PSA-9',
        guaranteeAmount: '',
        guaranteeCurrency: evmAssetID,
      })
    ).toEqual({ valid: false, issue: 'invalidGuaranteeAmount' });

    expect(
      validateSourceDepositListingBindings({
        sourceDepositID: 'dep-1',
        hubSlotID: 'slot-1',
        certNumber: 'PSA-9',
        guaranteeAmount: '0',
        guaranteeCurrency: evmAssetID,
      })
    ).toEqual({ valid: false, issue: 'invalidGuaranteeAmount' });

    expect(
      validateSourceDepositListingBindings({
        sourceDepositID: 'dep-1',
        hubSlotID: 'slot-1',
        certNumber: 'PSA-9',
        guaranteeAmount: '12.5',
        guaranteeCurrency: evmAssetID,
      })
    ).toEqual({ valid: false, issue: 'invalidGuaranteeAmount' });

    expect(
      validateSourceDepositListingBindings({
        sourceDepositID: 'dep-1',
        hubSlotID: 'slot-1',
        certNumber: 'PSA-9',
        guaranteeAmount: '100',
        guaranteeCurrency: 'not-an-asset',
      })
    ).toEqual({ valid: false, issue: 'invalidGuaranteeAsset' });
  });

  it('fails closed when a valid guarantee is declared but collateral bindings are incomplete', () => {
    const metadataOnly = [
      `collectibles.${COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.hubSlotId}=slot-1`,
      `collectibles.${COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.certNumber}=PSA-9`,
      `collectibles.${COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.holderWallet}=${solanaHolderWallet}`,
    ];
    expect(
      validateSourceDepositListingBindings({
        sourceDepositID: 'dep-1',
        hubSlotID: 'slot-1',
        certNumber: 'PSA-9',
        guaranteeAmount: '100',
        guaranteeCurrency: evmAssetID,
        orderOptionalFeatures: metadataOnly,
      })
    ).toEqual({ valid: false, issue: 'missingCollateralBindings' });
  });

  it('fails closed when declared guarantee amount or asset does not match signed collateral', () => {
    const wrongAmount = collateralFeatures.map(feature =>
      feature.includes(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralAmount)
        ? `collectibles.${COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralAmount}=200`
        : feature
    );
    expect(
      validateSourceDepositListingBindings({
        sourceDepositID: 'dep-1',
        hubSlotID: 'slot-1',
        certNumber: 'PSA-9',
        guaranteeAmount: '100',
        guaranteeCurrency: evmAssetID,
        orderOptionalFeatures: wrongAmount,
      })
    ).toEqual({ valid: false, issue: 'guaranteeAmountMismatch' });

    const wrongAsset = 'crypto:eip155:56:erc20:0x0000000000000000000000000000000000000002';
    const mismatchedAsset = collateralFeatures.map(feature =>
      feature.includes(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralAssetId)
        ? `collectibles.${COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralAssetId}=${wrongAsset}`
        : feature
    );
    expect(
      validateSourceDepositListingBindings({
        sourceDepositID: 'dep-1',
        hubSlotID: 'slot-1',
        certNumber: 'PSA-9',
        guaranteeAmount: '100',
        guaranteeCurrency: evmAssetID,
        orderOptionalFeatures: mismatchedAsset,
      })
    ).toEqual({ valid: false, issue: 'guaranteeAssetMismatch' });
  });

  it('rejects invalid eip155 chain references in collateral asset ids', () => {
    const invalidChainAsset = 'crypto:eip155:056:erc20:0x0000000000000000000000000000000000000001';
    const invalidChainFeatures = collateralFeatures.map(feature =>
      feature.includes(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralAssetId)
        ? `collectibles.${COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralAssetId}=${invalidChainAsset}`
        : feature
    );
    expect(validateCollectibleOrderOptionalFeatures(invalidChainFeatures)).toEqual({
      valid: false,
      issue: 'invalidCollateralAsset',
    });
  });

  it('fails closed when collectible signed optional features have missing or non-zero surcharge', () => {
    const collectibleName = `collectibles.${COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.collateralAmount}=100`;
    expect(
      readCollectibleSignedOrderOptionalFeatures([{ name: collectibleName, surcharge: '1' }])
    ).toEqual({ valid: false, issue: 'invalidCollectibleSurcharge' });
    expect(readCollectibleSignedOrderOptionalFeatures([{ name: collectibleName }])).toEqual({
      valid: false,
      issue: 'invalidCollectibleSurcharge',
    });
    expect(readCollectibleSignedOrderOptionalFeatures([collectibleName])).toEqual({
      valid: false,
      issue: 'invalidCollectibleSurcharge',
    });
    expect(
      readCollectibleSignedOrderOptionalFeatures([
        { name: 'Gift wrap', surcharge: '500' },
        ...signedListingEntries(collateralFeatures),
      ])
    ).toEqual({
      valid: true,
      features: expect.any(Array),
    });
  });

  it('round-trips a valid exact guarantee match to PurchaseItem optional features', () => {
    const signedEntries = orderOptionalFeaturesToSignedListingEntries(collateralFeatures);
    const payload = buildCollectiblePurchaseItemPayload({
      fulfillment: 'nft',
      hubSlotID: 'slot-1',
      certNumber: 'PSA-9',
      optionalFeatures: sortCollectibleOrderOptionalFeatures(collateralFeatures),
    });
    expect(payload.optionalFeatures).toEqual(
      expect.arrayContaining(sortCollectibleOrderOptionalFeatures(collateralFeatures))
    );
    expect(
      readCollectibleSignedOrderOptionalFeatures(signedEntries, {
        hubSlotID: 'slot-1',
        certNumber: 'PSA-9',
        requiredCollateralAmount: '100',
        requiredCollateralAssetID: evmAssetID,
      })
    ).toEqual({
      valid: true,
      features: sortCollectibleOrderOptionalFeatures(collateralFeatures),
    });
  });

  it('replaces seller holder_wallet with buyer wallet on first-sale PurchaseItem', () => {
    const sellerWallet = 'SellerSol111111111111111111111111111111';
    const buyerWallet = 'BuyerSol1111111111111111111111111111111';
    const hostingFeatures = collateralFeatures.map(feature =>
      feature.includes(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.holderWallet)
        ? `collectibles.${COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.holderWallet}=${sellerWallet}`
        : feature
    );

    const payload = buildCollectiblePurchaseItemPayload({
      fulfillment: 'nft',
      hubSlotID: 'slot-1',
      certNumber: 'PSA-9',
      holderWallet: buyerWallet,
      optionalFeatures: sortCollectibleOrderOptionalFeatures(hostingFeatures),
    });

    expect(payload.holderWallet).toBe(buyerWallet);
    const holderEntries = (payload.optionalFeatures ?? []).filter(feature =>
      feature.startsWith(`collectibles.${COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.holderWallet}=`)
    );
    expect(holderEntries).toEqual([
      `collectibles.${COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.holderWallet}=${buyerWallet}`,
    ]);
    expect(payload.optionalFeatures ?? []).not.toContain(
      `collectibles.${COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.holderWallet}=${sellerWallet}`
    );
    for (const feature of hostingFeatures) {
      if (feature.includes(COLLECTIBLE_ORDER_OPTIONAL_FEATURE_KEYS.holderWallet)) continue;
      expect(payload.optionalFeatures).toContain(feature);
    }
  });
});
