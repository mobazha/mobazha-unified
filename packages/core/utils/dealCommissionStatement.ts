// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import BigNumber from 'bignumber.js';
import type { DealCommissionStatement } from '../types/dealCommissionStatement';

function invalidStatementField(field: string): never {
  throw new Error(`Invalid Deal commission statement field: ${field}`);
}

function readRequiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) return invalidStatementField(field);
  return value.trim();
}

function readRequiredInteger(value: unknown, field: string, maximum?: number): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    (maximum !== undefined && value > maximum)
  ) {
    return invalidStatementField(field);
  }
  return value;
}

function readRequiredAtomicString(value: unknown, field: string): string {
  if (typeof value !== 'string') return invalidStatementField(field);
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return invalidStatementField(field);
  return trimmed;
}

function readRequiredTimestamp(value: unknown, field: string): string {
  const timestamp = readRequiredString(value, field);
  if (Number.isNaN(Date.parse(timestamp))) return invalidStatementField(field);
  return timestamp;
}

export function buildPromoterCommissionsHref(): string {
  return '/promote/commissions';
}

export function normalizeDealCommissionStatement(
  raw: Record<string, unknown>
): DealCommissionStatement {
  const settlementMode = readRequiredString(raw.settlementMode, 'settlementMode');
  const payable = raw.payable;
  if (settlementMode !== 'manual_review_only') invalidStatementField('settlementMode');
  if (payable !== false) invalidStatementField('payable');

  return {
    id: readRequiredString(raw.id, 'id'),
    attributionClaimID: readRequiredString(raw.attributionClaimID, 'attributionClaimID'),
    acceptanceID: readRequiredString(raw.acceptanceID, 'acceptanceID'),
    orderID: readRequiredString(raw.orderID, 'orderID'),
    programID: readRequiredString(raw.programID, 'programID'),
    dealLinkID: readRequiredString(raw.dealLinkID, 'dealLinkID'),
    status: readRequiredString(raw.status, 'status'),
    calculationBase: readRequiredString(raw.calculationBase, 'calculationBase'),
    commissionRateBPS: readRequiredInteger(raw.commissionRateBPS, 'commissionRateBPS'),
    commissionBaseAmountAtomic: readRequiredAtomicString(
      raw.commissionBaseAmountAtomic,
      'commissionBaseAmountAtomic'
    ),
    proposedCommissionAmountAtomic: readRequiredAtomicString(
      raw.proposedCommissionAmountAtomic,
      'proposedCommissionAmountAtomic'
    ),
    currency: readRequiredString(raw.currency, 'currency'),
    currencyDivisibility: readRequiredInteger(raw.currencyDivisibility, 'currencyDivisibility', 18),
    declaredFundingSource: readRequiredString(raw.declaredFundingSource, 'declaredFundingSource'),
    settlementMode,
    payable,
    reviewNotBefore: readRequiredTimestamp(raw.reviewNotBefore, 'reviewNotBefore'),
    observedAt: readRequiredTimestamp(raw.observedAt, 'observedAt'),
  };
}

export type AtomicAmountFormatFailureReason =
  | 'missing_currency'
  | 'invalid_amount'
  | 'invalid_divisibility';

export type AtomicAmountFormatResult =
  | {
      ok: true;
      majorAmount: string;
    }
  | {
      ok: false;
      reason: 'invalid_amount' | 'invalid_divisibility';
    };

/** Convert backend atomic amount strings to exact major-unit decimal strings. */
export function convertAtomicAmountToMajor(
  amountAtomic: string,
  currencyDivisibility: number
): AtomicAmountFormatResult {
  const trimmed = amountAtomic.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) {
    return { ok: false, reason: 'invalid_amount' };
  }
  if (
    !Number.isInteger(currencyDivisibility) ||
    currencyDivisibility < 0 ||
    currencyDivisibility > 18
  ) {
    return { ok: false, reason: 'invalid_divisibility' };
  }

  const majorAmount = new BigNumber(trimmed).shiftedBy(-currencyDivisibility).toFixed();
  return { ok: true, majorAmount };
}

export interface FormatAtomicCommissionAmountInput {
  amountAtomic: string;
  currency?: string | null;
  currencyDivisibility: number;
  formatPrice: (amount: number | string, currency: string) => string;
  missingCurrencyLabel: string;
  invalidAmountLabel: string;
}

export interface FormatAtomicCommissionAmountSuccess {
  ok: true;
  display: string;
  currency: string;
}

export interface FormatAtomicCommissionAmountFailure {
  ok: false;
  display: string;
  reason: AtomicAmountFormatFailureReason;
}

export type FormatAtomicCommissionAmountResult =
  | FormatAtomicCommissionAmountSuccess
  | FormatAtomicCommissionAmountFailure;

/** Exact atomic → display formatting; never coerces atomic strings through Number. */
export function formatAtomicCommissionAmount(
  input: FormatAtomicCommissionAmountInput
): FormatAtomicCommissionAmountResult {
  const currency = input.currency?.trim();
  if (!currency) {
    return {
      ok: false,
      display: input.missingCurrencyLabel,
      reason: 'missing_currency',
    };
  }

  const converted = convertAtomicAmountToMajor(input.amountAtomic, input.currencyDivisibility);
  if (!converted.ok) {
    return {
      ok: false,
      display: input.invalidAmountLabel,
      reason: converted.reason,
    };
  }

  return {
    ok: true,
    display: input.formatPrice(converted.majorAmount, currency),
    currency,
  };
}

export function truncateStatementReference(value: string, head = 6, tail = 4): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.length <= head + tail + 1) return trimmed;
  return `${trimmed.slice(0, head)}…${trimmed.slice(-tail)}`;
}
