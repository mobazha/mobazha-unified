// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { CollateralAccount } from './types';

export interface CollateralAccountBinding {
  providerID: string;
  resourceID: string;
  assetID: string;
  requiredAmount: string;
  policyID: string;
  policyVersion: string;
}

export type CollateralAccountSelectionResult =
  | { status: 'none' }
  | { status: 'matched'; account: CollateralAccount }
  | { status: 'mismatch' };

function normalizeBinding(binding: CollateralAccountBinding): CollateralAccountBinding {
  return {
    providerID: binding.providerID.trim(),
    resourceID: binding.resourceID.trim(),
    assetID: binding.assetID.trim(),
    requiredAmount: binding.requiredAmount.trim(),
    policyID: binding.policyID.trim(),
    policyVersion: binding.policyVersion.trim(),
  };
}

export function collateralAccountMatchesBinding(
  account: CollateralAccount,
  binding: CollateralAccountBinding
): boolean {
  const normalized = normalizeBinding(binding);
  return (
    account.providerID.trim() === normalized.providerID &&
    account.resourceID.trim() === normalized.resourceID &&
    account.assetID.trim() === normalized.assetID &&
    account.requiredAmount.trim() === normalized.requiredAmount &&
    account.policyID.trim() === normalized.policyID &&
    account.policyVersion.trim() === normalized.policyVersion
  );
}

/** Select newest-first exact binding match; fail closed when stale accounts exist. */
export function resolveCollateralAccountSelection(
  items: readonly CollateralAccount[] | null | undefined,
  binding: CollateralAccountBinding
): CollateralAccountSelectionResult {
  const accounts = items ?? [];
  if (accounts.length === 0) {
    return { status: 'none' };
  }

  const match = accounts.find(account => collateralAccountMatchesBinding(account, binding));
  if (match) {
    return { status: 'matched', account: match };
  }
  return { status: 'mismatch' };
}
