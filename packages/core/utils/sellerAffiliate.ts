// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { errorTracker } from '../services/monitoring/errorTracker';
import type {
  PublicSellerAffiliateLink,
  SellerAffiliateAttribution,
  SellerAffiliateCommissionLine,
  SellerAffiliateDisplayStatus,
  SellerAffiliateGroupedStatement,
  SellerAffiliateLink,
  SellerAffiliateProgram,
  SellerAffiliateReferralSession,
  SellerAffiliateSettlementState,
  SellerAffiliateStatementLine,
  SellerAffiliateSettlementOutput,
} from '../types/sellerAffiliate';

function record(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value))
    return value as Record<string, unknown>;
  throw new Error('Invalid seller affiliate response');
}

function data(value: unknown): Record<string, unknown> {
  const raw = record(value);
  return 'data' in raw ? record(raw.data) : raw;
}

function stringField(raw: Record<string, unknown>, key: string): string {
  const value = raw[key];
  if (typeof value !== 'string' || !value.trim())
    throw new Error(`Invalid seller affiliate field: ${key}`);
  return value;
}

function numberField(raw: Record<string, unknown>, key: string): number {
  const value = raw[key];
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new Error(`Invalid seller affiliate field: ${key}`);
  return value;
}

export function unwrapSellerAffiliateList(value: unknown): Record<string, unknown>[] {
  const raw =
    value && typeof value === 'object' && !Array.isArray(value) && 'data' in value
      ? (value as Record<string, unknown>).data
      : value;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is Record<string, unknown> =>
      item !== null && typeof item === 'object' && !Array.isArray(item)
  );
}

export function normalizeSellerAffiliateProgram(value: unknown): SellerAffiliateProgram {
  const raw = data(value);
  const status = stringField(raw, 'status');
  if (status !== 'active' && status !== 'paused')
    throw new Error('Invalid seller affiliate program status');
  return {
    id: stringField(raw, 'id'),
    sellerPeerID: stringField(raw, 'sellerPeerID'),
    status,
    commissionRateBPS: numberField(raw, 'commissionRateBPS'),
    attributionWindowSeconds: numberField(raw, 'attributionWindowSeconds'),
    createdAt: stringField(raw, 'createdAt'),
    updatedAt: stringField(raw, 'updatedAt'),
  };
}

export function normalizeSellerAffiliateLink(value: unknown): SellerAffiliateLink {
  const raw = data(value);
  const status = stringField(raw, 'status');
  if (status !== 'active' && status !== 'revoked')
    throw new Error('Invalid seller affiliate link status');
  return {
    id: stringField(raw, 'id'),
    programID: stringField(raw, 'programID'),
    promoterPeerID: stringField(raw, 'promoterPeerID'),
    publicToken: stringField(raw, 'publicToken'),
    publicPath: stringField(raw, 'publicPath'),
    status,
    createdAt: stringField(raw, 'createdAt'),
    updatedAt: stringField(raw, 'updatedAt'),
  };
}

export function normalizePublicSellerAffiliateLink(value: unknown): PublicSellerAffiliateLink {
  const raw = data(value);
  const status = stringField(raw, 'status');
  if (status !== 'active' && status !== 'paused')
    throw new Error('Invalid public seller affiliate status');
  return {
    programID: stringField(raw, 'programID'),
    sellerPeerID: stringField(raw, 'sellerPeerID'),
    status,
    commissionRateBPS: numberField(raw, 'commissionRateBPS'),
    attributionWindowSeconds: numberField(raw, 'attributionWindowSeconds'),
  };
}

export function normalizeSellerAffiliateReferralSession(
  value: unknown
): SellerAffiliateReferralSession {
  const raw = data(value);
  return {
    referralSessionID: stringField(raw, 'referralSessionID'),
    sellerPeerID: stringField(raw, 'sellerPeerID'),
    expiresAt: stringField(raw, 'expiresAt'),
  };
}

function normalizeAttribution(value: unknown): SellerAffiliateAttribution {
  const raw = record(value);
  return {
    id: stringField(raw, 'id'),
    orderID: stringField(raw, 'orderID'),
    referralSessionID: stringField(raw, 'referralSessionID'),
    programID: stringField(raw, 'programID'),
    sellerPeerID: stringField(raw, 'sellerPeerID'),
    buyerPeerID: stringField(raw, 'buyerPeerID'),
    promoterPeerID: stringField(raw, 'promoterPeerID'),
    commissionRateBPSSnapshot: numberField(raw, 'commissionRateBPSSnapshot'),
    attributedAt: stringField(raw, 'attributedAt'),
  };
}

function normalizeCommissionLine(value: unknown): SellerAffiliateCommissionLine {
  const raw = record(value);
  const status = stringField(raw, 'status');
  if (status !== 'pending' && status !== 'reversed')
    throw new Error('Invalid seller affiliate commission status');
  return {
    attributionID: stringField(raw, 'attributionID'),
    orderID: stringField(raw, 'orderID'),
    orderLineID: stringField(raw, 'orderLineID'),
    netMerchandiseAtomic: stringField(raw, 'netMerchandiseAtomic'),
    commissionAtomic: stringField(raw, 'commissionAtomic'),
    currency: stringField(raw, 'currency'),
    status,
    ...(typeof raw.reversedAt === 'string' ? { reversedAt: raw.reversedAt } : {}),
    ...(typeof raw.reversalReason === 'string' ? { reversalReason: raw.reversalReason } : {}),
  };
}

function normalizeSettlementOutput(value: unknown): SellerAffiliateSettlementOutput {
  const raw = record(value);
  const state = stringField(raw, 'state');
  if (state !== 'planned' && state !== 'submitted' && state !== 'confirmed')
    throw new Error('Invalid seller affiliate settlement state');
  return {
    actionID: stringField(raw, 'actionId'),
    action: stringField(raw, 'action'),
    state,
    coin: stringField(raw, 'coin'),
    amount: stringField(raw, 'amount'),
    address: stringField(raw, 'address'),
    updatedAt: stringField(raw, 'updatedAt'),
    ...(typeof raw.txHash === 'string' && raw.txHash.trim() ? { txHash: raw.txHash } : {}),
    ...(typeof raw.confirmations === 'number' && Number.isInteger(raw.confirmations)
      ? { confirmations: raw.confirmations }
      : {}),
    ...(typeof raw.confirmedAt === 'string' && raw.confirmedAt.trim()
      ? { confirmedAt: raw.confirmedAt }
      : {}),
  };
}

/** A confirmed on-chain affiliate output cannot be reversed after the fact; it always wins over a `reversed` commission line. */
export function reportSellerAffiliateContractAnomaly(
  reason: string,
  line: SellerAffiliateStatementLine
): void {
  errorTracker.captureMessage(`seller affiliate contract anomaly: ${reason}`, {
    level: 'warning',
    tags: { module: 'sellerAffiliate', reason },
    extra: {
      orderID: line.commissionLine.orderID,
      attributionID: line.commissionLine.attributionID,
      settlementActionID: line.settlement?.actionID,
    },
  });
}

export function deriveSellerAffiliateDisplayStatus(
  line: SellerAffiliateStatementLine
): SellerAffiliateDisplayStatus {
  const isConfirmed = line.settlement?.state === 'confirmed';
  const isReversed = line.commissionLine.status === 'reversed';

  if (isConfirmed && isReversed) {
    reportSellerAffiliateContractAnomaly('confirmed_settlement_with_reversed_commission', line);
  }

  if (isConfirmed) return 'paid';
  if (isReversed) return 'reversed';
  if (line.settlement?.state === 'planned' || line.settlement?.state === 'submitted')
    return 'settling';
  return 'pending';
}

export function normalizeSellerAffiliateStatementLine(
  value: unknown
): SellerAffiliateStatementLine {
  const raw = record(value);
  const settlement = raw.settlement;
  return {
    attribution: normalizeAttribution(raw.attribution),
    commissionLine: normalizeCommissionLine(raw.commissionLine),
    ...(settlement !== undefined && settlement !== null
      ? { settlement: normalizeSettlementOutput(settlement) }
      : {}),
  };
}

const SETTLEMENT_STATE_RANK: Record<SellerAffiliateSettlementState, number> = {
  confirmed: 3,
  submitted: 2,
  planned: 1,
};

function pickRepresentativeSettlement(
  lines: SellerAffiliateStatementLine[]
): SellerAffiliateSettlementOutput | undefined {
  let best: SellerAffiliateSettlementOutput | undefined;
  for (const { settlement } of lines) {
    if (!settlement) continue;
    const isBetter =
      !best ||
      SETTLEMENT_STATE_RANK[settlement.state] > SETTLEMENT_STATE_RANK[best.state] ||
      (SETTLEMENT_STATE_RANK[settlement.state] === SETTLEMENT_STATE_RANK[best.state] &&
        settlement.updatedAt > best.updatedAt);
    if (isBetter) best = settlement;
  }
  return best;
}

/**
 * Collapses statement lines by order + currency so a single settlement (and its tx)
 * is shown once per order instead of once per commission line, and commission amounts
 * are summed with BigInt rather than floating point.
 */
export function groupSellerAffiliateStatementLines(
  lines: SellerAffiliateStatementLine[]
): SellerAffiliateGroupedStatement[] {
  const groupKeys: string[] = [];
  const groups = new Map<string, SellerAffiliateStatementLine[]>();

  for (const line of lines) {
    const key = `${line.commissionLine.orderID}::${line.commissionLine.currency}`;
    const existing = groups.get(key);
    if (existing) {
      existing.push(line);
    } else {
      groups.set(key, [line]);
      groupKeys.push(key);
    }
  }

  return groupKeys.map(key => {
    const groupLines = groups.get(key) as SellerAffiliateStatementLine[];
    const lineStatuses = groupLines.map(deriveSellerAffiliateDisplayStatus);
    const hasReversed = lineStatuses.includes('reversed');
    const hasActive = lineStatuses.some(status => status !== 'reversed');

    if (hasReversed && hasActive) {
      reportSellerAffiliateContractAnomaly(
        'mixed_reversed_and_active_commission_lines_for_order',
        groupLines[0]
      );
    }

    let displayStatus: SellerAffiliateDisplayStatus;
    if (lineStatuses.includes('paid')) {
      displayStatus = 'paid';
    } else if (!hasActive) {
      displayStatus = 'reversed';
    } else if (lineStatuses.includes('settling')) {
      displayStatus = 'settling';
    } else {
      displayStatus = 'pending';
    }

    const commissionAtomic = groupLines
      .reduce((sum, line) => sum + BigInt(line.commissionLine.commissionAtomic), BigInt(0))
      .toString();

    return {
      orderID: groupLines[0].commissionLine.orderID,
      currency: groupLines[0].commissionLine.currency,
      commissionAtomic,
      displayStatus,
      settlement: pickRepresentativeSettlement(groupLines),
      lines: groupLines,
    };
  });
}
