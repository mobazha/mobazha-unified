// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

export type SourceDepositPrincipalBindingIssue =
  | 'missing_deposit_seller'
  | 'missing_current_principal'
  | 'mismatch';

export type SourceDepositPrincipalBindingResult =
  | { allowed: true }
  | { allowed: false; issue: SourceDepositPrincipalBindingIssue };

export interface SourceDepositPrincipalBindingInput {
  depositSellerPeerID?: string | null;
  currentPrincipalPeerID?: string | null;
}

/** Fail closed unless the deposit owner matches the selected local Node principal. */
export function resolveSourceDepositPrincipalBinding(
  input: SourceDepositPrincipalBindingInput
): SourceDepositPrincipalBindingResult {
  const depositSellerPeerID = input.depositSellerPeerID?.trim() ?? '';
  const currentPrincipalPeerID = input.currentPrincipalPeerID?.trim() ?? '';

  if (!depositSellerPeerID) {
    return { allowed: false, issue: 'missing_deposit_seller' };
  }
  if (!currentPrincipalPeerID) {
    return { allowed: false, issue: 'missing_current_principal' };
  }
  if (depositSellerPeerID !== currentPrincipalPeerID) {
    return { allowed: false, issue: 'mismatch' };
  }
  return { allowed: true };
}

export function resolveSourceDepositPrincipalBindingI18nKey(
  issue: SourceDepositPrincipalBindingIssue
): string {
  switch (issue) {
    case 'missing_deposit_seller':
      return 'collectibles.collateral.funding.principalDepositOwnerMissing';
    case 'missing_current_principal':
      return 'collectibles.collateral.funding.principalIdentityUnavailable';
    case 'mismatch':
      return 'collectibles.collateral.funding.principalIdentityMismatch';
  }
}
