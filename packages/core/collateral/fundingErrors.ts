// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import {
  resolveEvmCollateralFundingValidationIssueKey,
  type EvmCollateralFundingValidationIssue,
} from './evmVaultFunding';

const FUNDING_VALIDATION_ISSUES = new Set<string>([
  'payloadUnavailable',
  'unsupportedRail',
  'unsupportedPayloadType',
  'invalidChain',
  'invalidAmount',
  'amountMismatch',
  'vaultMismatch',
  'invalidCalldata',
  'invalidCollateralKey',
  'invalidFundingKey',
  'assetMismatch',
  'selectorMismatch',
  'calldataArgumentMismatch',
]);

export function resolveCollateralFundingErrorKey(cause: unknown, fallbackKey: string): string {
  if (cause instanceof Error) {
    const issue = cause.message.trim();
    if (issue.startsWith('collectibles.')) {
      return issue;
    }
    if (FUNDING_VALIDATION_ISSUES.has(issue)) {
      return resolveEvmCollateralFundingValidationIssueKey(
        issue as EvmCollateralFundingValidationIssue
      );
    }
  }
  return fallbackKey;
}
