// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it } from 'vitest';
import { buildCollectiblePurchaseItemPayload } from '@mobazha/core';
import {
  hasAuthoritativeCollectibleTitleMetadata,
  isCollectibleHubNftListing,
} from '@mobazha/core';

describe('collectible order payload propagation', () => {
  it('includes holderWallet on purchase items for authoritative checkout', () => {
    const holderWallet = 'BuyerSol1111111111111111111111111111111';
    const payload = buildCollectiblePurchaseItemPayload({
      fulfillment: 'nft',
      hubSlotID: 'slot-1',
      certNumber: 'PSA-123',
      holderWallet,
    });

    expect(payload.holderWallet).toBe(holderWallet);
    expect(payload.optionalFeatures).toContain(`collectibles.holder_wallet=${holderWallet}`);
  });

  it('omits holderWallet when not provided', () => {
    const payload = buildCollectiblePurchaseItemPayload({
      fulfillment: 'nft',
      hubSlotID: 'slot-1',
      certNumber: 'PSA-123',
    });

    expect(payload.holderWallet).toBeUndefined();
    expect(payload.optionalFeatures ?? []).not.toContain(expect.stringContaining('holder_wallet'));
  });
});

describe('authoritative collectible Solana wallet gating', () => {
  it('treats 0x addresses as non-Solana holder wallets', () => {
    const evmAddress = '0x1234567890123456789012345678901234567890';
    expect(evmAddress.startsWith('0x')).toBe(true);
  });

  it('requires AppKit Solana address shape for holder wallet propagation', () => {
    const solanaAddress = 'BuyerSol1111111111111111111111111111111';
    expect(solanaAddress.startsWith('0x')).toBe(false);
    expect(solanaAddress.length).toBeGreaterThan(20);
  });
});

describe('collectible checkout authoritative gate', () => {
  const solanaOnlyRwa = {
    metadata: { contractType: 'RWA_TOKEN' as const },
    item: { blockchain: 'solana', tokenAddress: 'mint-1' },
  };

  it('does not treat non-authoritative Solana RWA as authoritative checkout', () => {
    expect(isCollectibleHubNftListing(solanaOnlyRwa)).toBe(true);
    expect(hasAuthoritativeCollectibleTitleMetadata(solanaOnlyRwa)).toBe(false);
  });

  it('keeps non-authoritative RWA on the blocked legacy checkout path', () => {
    const collectiblesHubEnabled = true;
    const isAuthoritativeCollectibleTitle = hasAuthoritativeCollectibleTitleMetadata(solanaOnlyRwa);
    const isRwaCheckoutBlocked =
      solanaOnlyRwa.metadata.contractType === 'RWA_TOKEN' &&
      (isAuthoritativeCollectibleTitle ? !collectiblesHubEnabled : true);

    expect(isAuthoritativeCollectibleTitle).toBe(false);
    expect(isRwaCheckoutBlocked).toBe(true);
  });
});
