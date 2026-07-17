// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it } from 'vitest';
import {
  isNativeMarketplaceSelfServeEligible,
  nativeMarketplaceSellStatusKey,
  resolveNativeMarketplaceSellPolicy,
} from '../../utils/nativeMarketplaceSell';
import type {
  NativeMarketplaceSellerApplication,
  PublicNativeMarketplace,
} from '../../types/marketplace';

function buildMarketplace(
  overrides: Partial<PublicNativeMarketplace> = {}
): PublicNativeMarketplace {
  return {
    id: 'mp-1',
    name: 'Test Market',
    slug: 'test-market',
    publicURL: 'https://test.example',
    buyerAccessMode: 'open',
    sellerReviewMode: 'manual',
    catalogMode: 'curated',
    discoverability: 'public',
    sellerEntryMode: 'seller_self_serve',
    vertical: 'general',
    sellerCount: 0,
    productCount: 0,
    ...overrides,
  };
}

function buildApplication(
  overrides: Partial<NativeMarketplaceSellerApplication> = {}
): NativeMarketplaceSellerApplication {
  return {
    hasApplication: true,
    productGroupIDs: [1],
    autoApproved: false,
    membership: {
      id: 1,
      tenantID: 'tenant-1',
      marketplaceID: 'mp-1',
      userID: 'user-1',
      peerID: 'QmSeller',
      status: 'applied',
      unreadReviewCount: 0,
      isVisible: false,
      productGroupIDs: [1],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    ...overrides,
  };
}

describe('isNativeMarketplaceSelfServeEligible', () => {
  it('allows seller_self_serve mode', () => {
    expect(
      isNativeMarketplaceSelfServeEligible(
        buildMarketplace({ sellerEntryMode: 'seller_self_serve' })
      )
    ).toBe(true);
  });

  it('blocks operator-invited markets', () => {
    expect(
      isNativeMarketplaceSelfServeEligible(
        buildMarketplace({ sellerEntryMode: 'operator_invited' })
      )
    ).toBe(false);
  });
});

describe('resolveNativeMarketplaceSellPolicy', () => {
  it('lets curated catalogs submit without product groups (join-first)', () => {
    const policy = resolveNativeMarketplaceSellPolicy(
      buildMarketplace({ catalogMode: 'curated' }),
      null,
      0
    );

    // Hosting accepts a group-less application in every catalog mode; the
    // seller can attach catalog after joining.
    expect(policy.requiresProductGroups).toBe(false);
    expect(policy.showSubmit).toBe(true);
    expect(policy.canSubmit).toBe(true);
    expect(policy.showGroupsValidation).toBe(false);
  });

  it('allows zero groups for open catalogs', () => {
    const policy = resolveNativeMarketplaceSellPolicy(
      buildMarketplace({ catalogMode: 'open', sellerReviewMode: 'auto' }),
      null,
      0
    );

    expect(policy.requiresProductGroups).toBe(false);
    expect(policy.showSubmit).toBe(true);
    expect(policy.canSubmit).toBe(true);
    expect(policy.isAutoApproval).toBe(true);
  });

  it('allows curated submission with a zero-item owned group selected', () => {
    const policy = resolveNativeMarketplaceSellPolicy(
      buildMarketplace({ catalogMode: 'curated' }),
      null,
      1
    );

    expect(policy.showSubmit).toBe(true);
    expect(policy.canSubmit).toBe(true);
    expect(policy.showGroupsValidation).toBe(false);
  });

  it('locks selection and allows withdraw for applied applications', () => {
    const policy = resolveNativeMarketplaceSellPolicy(
      buildMarketplace(),
      buildApplication({ membership: { ...buildApplication().membership!, status: 'applied' } }),
      1
    );

    expect(policy.isSelectionLocked).toBe(true);
    expect(policy.showWithdraw).toBe(true);
    expect(policy.canWithdraw).toBe(true);
    expect(policy.showSubmit).toBe(false);
    expect(policy.canSubmit).toBe(false);
    expect(policy.showGroupsValidation).toBe(false);
  });

  it('keeps submit visible but disabled while submitting', () => {
    const policy = resolveNativeMarketplaceSellPolicy(
      buildMarketplace({ catalogMode: 'open', sellerReviewMode: 'auto' }),
      null,
      0,
      { isSubmitting: true }
    );

    expect(policy.showSubmit).toBe(true);
    expect(policy.canSubmit).toBe(false);
  });

  it('keeps withdraw visible but disabled while withdrawing', () => {
    const policy = resolveNativeMarketplaceSellPolicy(
      buildMarketplace(),
      buildApplication({ membership: { ...buildApplication().membership!, status: 'applied' } }),
      1,
      { isWithdrawing: true }
    );

    expect(policy.showWithdraw).toBe(true);
    expect(policy.canWithdraw).toBe(false);
  });

  it('allows reapply after rejection or withdrawal', () => {
    const rejected = resolveNativeMarketplaceSellPolicy(
      buildMarketplace(),
      buildApplication({ membership: { ...buildApplication().membership!, status: 'rejected' } }),
      1
    );
    const left = resolveNativeMarketplaceSellPolicy(
      buildMarketplace(),
      buildApplication({ membership: { ...buildApplication().membership!, status: 'left' } }),
      1
    );

    expect(rejected.showSubmit).toBe(true);
    expect(rejected.canSubmit).toBe(true);
    expect(left.showSubmit).toBe(true);
    expect(left.canSubmit).toBe(true);
    expect(left.showApplicationForm).toBe(true);
  });

  it('blocks suspended sellers from reapplying', () => {
    const policy = resolveNativeMarketplaceSellPolicy(
      buildMarketplace(),
      buildApplication({ membership: { ...buildApplication().membership!, status: 'suspended' } }),
      1
    );

    expect(policy.showSubmit).toBe(false);
    expect(policy.canSubmit).toBe(false);
    expect(policy.showApplicationForm).toBe(false);
  });

  it('shows the application form before the first submission', () => {
    const policy = resolveNativeMarketplaceSellPolicy(buildMarketplace(), null, 0);
    expect(policy.showApplicationForm).toBe(true);
    expect(policy.showSubmit).toBe(true);
    // Zero selected groups no longer blocks submission in any catalog mode.
    expect(policy.canSubmit).toBe(true);
    expect(policy.showGroupsValidation).toBe(false);
  });
});

describe('nativeMarketplaceSellStatusKey', () => {
  it('maps native membership statuses to i18n keys', () => {
    expect(nativeMarketplaceSellStatusKey('applied')).toBe('marketplace.sell.statusApplied');
    expect(nativeMarketplaceSellStatusKey('left')).toBe('marketplace.sell.statusLeft');
    expect(nativeMarketplaceSellStatusKey('approved')).toBe('marketplace.sell.statusApproved');
  });
});
