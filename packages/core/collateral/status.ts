// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { CollateralAccount, CollateralProtectionStatus } from './types';

export function resolveCollateralProtectionStatus(input: {
  requirementStatus?: string;
  guaranteeAmount?: string;
  guaranteeAssetID?: string;
  account?: CollateralAccount | null;
  now?: Date;
}): CollateralProtectionStatus {
  const state = input.account?.state?.trim().toLowerCase();
  if (state === 'slashed' || state === 'slash-pending' || state === 'failed') return 'impaired';
  if (state === 'released' || state === 'release-pending') return 'expired';
  if (input.account?.expiresAt) {
    const expiresAt = Date.parse(input.account.expiresAt);
    if (Number.isFinite(expiresAt) && expiresAt <= (input.now ?? new Date()).getTime()) {
      return 'expired';
    }
  }
  if (state === 'active') return 'active';
  if (state === 'pending-funding') return 'funding';

  const requirementStatus = input.requirementStatus?.trim().toLowerCase();
  if (requirementStatus === 'funding' || requirementStatus === 'pending-funding') return 'funding';
  if (requirementStatus === 'slashed' || requirementStatus === 'failed') return 'impaired';
  if (requirementStatus === 'expired' || requirementStatus === 'released') return 'expired';
  if (requirementStatus === 'funded' || requirementStatus === 'active') return 'declared';
  if (input.guaranteeAmount?.trim() && input.guaranteeAssetID?.trim()) return 'declared';
  return 'unsecured';
}

export function isCollateralProtectionActive(status: CollateralProtectionStatus): boolean {
  return status === 'active';
}

export function isCollateralProtectionVerified(status: CollateralProtectionStatus): boolean {
  return status === 'verified-allocation';
}

/** Positive buyer-facing protection: live account or Core-verified allocation credential. */
export function isCollateralProtectionPositive(status: CollateralProtectionStatus): boolean {
  return status === 'active' || status === 'verified-allocation';
}
