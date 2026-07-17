// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import BigNumber from 'bignumber.js';
import { errorTracker } from '../services/monitoring/errorTracker';
import type {
  PublicSellerAffiliateLink,
  SellerAffiliateAttribution,
  SellerAffiliateCapabilities,
  SellerAffiliateCommissionLine,
  SellerAffiliateDisplayStatus,
  SellerAffiliateGroupedStatement,
  SellerAffiliateLink,
  SellerAffiliatePayoutRail,
  SellerAffiliateProgram,
  SellerAffiliateReferralSession,
  SellerAffiliateSettlementState,
  SellerAffiliateStatementLine,
  SellerAffiliateStatementPage,
  SellerAffiliateSettlementOutput,
} from '../types/sellerAffiliate';

const SECONDS_PER_DAY = 86_400;
const SECONDS_PER_HOUR = 3_600;
const SECONDS_PER_MINUTE = 60;

/** An attribution window expressed in the largest unit that represents it exactly. */
export interface SellerAffiliateAttributionWindow {
  unit: 'day' | 'hour' | 'minute' | 'second';
  value: number;
}

export type SellerAffiliateAttributionUnit = SellerAffiliateAttributionWindow['unit'];

export interface SellerAffiliateAttributionInput {
  value: string;
  unit: SellerAffiliateAttributionUnit;
}

const ATTRIBUTION_UNIT_SECONDS: Record<SellerAffiliateAttributionUnit, number> = {
  day: SECONDS_PER_DAY,
  hour: SECONDS_PER_HOUR,
  minute: SECONDS_PER_MINUTE,
  second: 1,
};

/**
 * Describes an attribution window in the largest unit that divides it exactly,
 * so a 3600-second window reads "1 hour" and is never rounded up to "1 day".
 * Commission terms must not be misstated by display rounding.
 */
export function describeSellerAffiliateAttributionWindow(
  seconds: number
): SellerAffiliateAttributionWindow {
  if (!Number.isFinite(seconds) || seconds <= 0) return { unit: 'second', value: 0 };
  if (seconds % SECONDS_PER_DAY === 0) return { unit: 'day', value: seconds / SECONDS_PER_DAY };
  if (seconds % SECONDS_PER_HOUR === 0) return { unit: 'hour', value: seconds / SECONDS_PER_HOUR };
  if (seconds % SECONDS_PER_MINUTE === 0)
    return { unit: 'minute', value: seconds / SECONDS_PER_MINUTE };
  return { unit: 'second', value: seconds };
}

/**
 * i18n key + params for an attribution window, shared by every surface that
 * renders the window so seller and promoter always see the same wording.
 */
export function sellerAffiliateAttributionWindowCopy(seconds: number): {
  key: string;
  params?: Record<string, string>;
} {
  const window = describeSellerAffiliateAttributionWindow(seconds);
  switch (window.unit) {
    case 'day':
      return window.value === 1
        ? { key: 'sellerAffiliate.windowDay' }
        : { key: 'sellerAffiliate.windowDays', params: { count: String(window.value) } };
    case 'hour':
      return window.value === 1
        ? { key: 'sellerAffiliate.windowHour' }
        : { key: 'sellerAffiliate.windowHours', params: { count: String(window.value) } };
    case 'minute':
      return { key: 'sellerAffiliate.windowMinutes', params: { count: String(window.value) } };
    default:
      return { key: 'sellerAffiliate.windowSeconds', params: { count: String(window.value) } };
  }
}

/**
 * Produces an exact value + unit pair for the seller form. This avoids exposing
 * implementation-oriented fractional days such as 0.04 when the stored term is
 * the much clearer "1 hour".
 */
export function sellerAffiliateAttributionInput(seconds: number): SellerAffiliateAttributionInput {
  const window = describeSellerAffiliateAttributionWindow(seconds);
  return {
    value: window.value > 0 ? String(window.value) : '',
    unit: window.unit,
  };
}

/**
 * Converts the seller-facing value + unit control back to whole seconds.
 * Windows must be at least one minute and no longer than one year.
 */
export function sellerAffiliateAttributionSecondsFromInput(
  input: string,
  unit: SellerAffiliateAttributionUnit
): number | null {
  const value = Number(input);
  if (!Number.isFinite(value) || value <= 0) return null;
  const seconds = Math.round(value * ATTRIBUTION_UNIT_SECONDS[unit]);
  if (seconds < SECONDS_PER_MINUTE || seconds > 365 * SECONDS_PER_DAY) return null;
  return seconds;
}

/**
 * Renders the seller panel's "attribution days" input value without inventing
 * precision: whole days stay integers; sub-day windows keep two decimals so a
 * 1-hour window reads "0.04" instead of a fabricated "1".
 */
export function sellerAffiliateAttributionDaysInput(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  if (seconds % SECONDS_PER_DAY === 0) return String(seconds / SECONDS_PER_DAY);
  const days = (seconds / SECONDS_PER_DAY).toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return days === '' || days === '0' ? '0.01' : days;
}

/**
 * Parses the seller panel's days input into whole seconds. Fractional days are
 * allowed (0.5 = 12 hours). Returns null when the input cannot be a real
 * window (non-numeric, non-positive, above one year, or under one minute).
 */
export function sellerAffiliateAttributionSecondsFromDaysInput(input: string): number | null {
  return sellerAffiliateAttributionSecondsFromInput(input, 'day');
}

/**
 * Grades an attribution window against how content-driven promotion actually
 * converts. Social/video audiences buy over days, so a very short window
 * silently discards sales a promoter genuinely drove — the seller should be
 * warned before saving one, not after promoters churn.
 *
 * - 'too_short': under one day; most referred buyers never convert this fast.
 * - 'short': under a week; workable but below the 7–30 day norm.
 * - null: at or above a week; no advice needed.
 */
export function sellerAffiliateAttributionWindowAdvice(
  seconds: number
): 'too_short' | 'short' | null {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  if (seconds < SECONDS_PER_DAY) return 'too_short';
  if (seconds < 7 * SECONDS_PER_DAY) return 'short';
  return null;
}

/**
 * Estimates a promoter's commission on one sale from the item's merchandise
 * amount (minimal units) and the program rate in basis points, floored like
 * the backend. Display-only: a promoter sees "you earn ≈X" per item so the
 * commission rate becomes a concrete number instead of an abstract percent.
 */
export function estimateSellerAffiliateCommissionAtomic(
  merchandiseAtomic: string | number,
  commissionRateBPS: number
): string {
  if (!Number.isFinite(commissionRateBPS) || commissionRateBPS <= 0) return '0';
  const merchandise = new BigNumber(merchandiseAtomic);
  if (!merchandise.isFinite() || merchandise.lte(0)) return '0';
  return merchandise
    .multipliedBy(commissionRateBPS)
    .dividedBy(10_000)
    .integerValue(BigNumber.ROUND_FLOOR)
    .toFixed(0);
}

/** A promoter's/seller's earnings at a glance: counts by lifecycle plus paid totals per currency. */
export interface SellerAffiliateEarningsSummary {
  totalOrders: number;
  /** Orders whose commission is confirmed paid on-chain. */
  paidOrders: number;
  /** Orders still in the pending/settling pipeline (not yet paid, not reversed). */
  pendingOrders: number;
  /** Orders whose commission was reversed or is awaiting clawback. */
  reversedOrders: number;
  /** Distinct promoters credited with at least one attributed order. */
  convertingPromoters: number;
  /** Confirmed-paid commission summed per currency, so mixed rails never cross-sum. */
  paidByCurrency: { currency: string; commissionAtomic: string }[];
  /** In-flight (pending/settling) commission summed per currency; money not yet paid out. */
  pendingByCurrency: { currency: string; commissionAtomic: string }[];
}

/**
 * Rolls grouped statements into a headline summary. Paid amounts stay grouped
 * by currency (a promoter paid in SOL and USDC must not be summed into one
 * meaningless number); fiat conversion, if any, is left to the display layer.
 */
export function summarizeSellerAffiliateEarnings(
  groups: SellerAffiliateGroupedStatement[]
): SellerAffiliateEarningsSummary {
  let paidOrders = 0;
  let pendingOrders = 0;
  let reversedOrders = 0;
  const paidTotals = new Map<string, bigint>();
  const paidCurrencyOrder: string[] = [];
  const pendingTotals = new Map<string, bigint>();
  const pendingCurrencyOrder: string[] = [];
  const promoters = new Set<string>();

  for (const group of groups) {
    for (const groupLine of group.lines) {
      const promoter = groupLine.attribution.promoterPeerID;
      if (promoter) promoters.add(promoter);
    }
    if (group.displayStatus === 'paid') {
      paidOrders += 1;
      const prior = paidTotals.get(group.currency);
      if (prior === undefined) paidCurrencyOrder.push(group.currency);
      paidTotals.set(group.currency, (prior ?? BigInt(0)) + BigInt(group.commissionAtomic));
    } else if (group.displayStatus === 'pending' || group.displayStatus === 'settling') {
      pendingOrders += 1;
      const prior = pendingTotals.get(group.currency);
      if (prior === undefined) pendingCurrencyOrder.push(group.currency);
      pendingTotals.set(group.currency, (prior ?? BigInt(0)) + BigInt(group.commissionAtomic));
    } else if (group.displayStatus === 'reversed' || group.displayStatus === 'clawback_due') {
      reversedOrders += 1;
    }
  }

  return {
    totalOrders: groups.length,
    paidOrders,
    pendingOrders,
    reversedOrders,
    convertingPromoters: promoters.size,
    paidByCurrency: paidCurrencyOrder.map(currency => ({
      currency,
      commissionAtomic: (paidTotals.get(currency) as bigint).toString(),
    })),
    pendingByCurrency: pendingCurrencyOrder.map(currency => ({
      currency,
      commissionAtomic: (pendingTotals.get(currency) as bigint).toString(),
    })),
  };
}

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
  let raw =
    value && typeof value === 'object' && !Array.isArray(value) && 'data' in value
      ? (value as Record<string, unknown>).data
      : value;
  // The statements endpoint returns a paginated envelope
  // ({items, page, pageSize, total, partial}); a bare array is the legacy
  // shape. Accepting only the array silently rendered every statement empty.
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'items' in raw) {
    raw = (raw as Record<string, unknown>).items;
  }
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is Record<string, unknown> =>
      item !== null && typeof item === 'object' && !Array.isArray(item)
  );
}

export function normalizeSellerAffiliateCapabilities(value: unknown): SellerAffiliateCapabilities {
  const raw = data(value);
  if (!Array.isArray(raw.rails)) throw new Error('Invalid seller affiliate capabilities');
  return {
    version: numberField(raw, 'version'),
    rails: raw.rails.map(value => {
      const rail = record(value);
      const assetScope = stringField(rail, 'assetScope');
      if (assetScope !== 'chain' && assetScope !== 'native' && assetScope !== 'exact')
        throw new Error('Invalid seller affiliate asset scope');
      if (!Array.isArray(rail.orderKinds) || !Array.isArray(rail.actions))
        throw new Error('Invalid seller affiliate rail capability');
      const orderKinds = rail.orderKinds.map(String);
      if (orderKinds.some(kind => kind !== 'standard' && kind !== 'guest'))
        throw new Error('Invalid seller affiliate order kind');
      return {
        railID: stringField(rail, 'railID'),
        assetScope,
        orderKinds: orderKinds as Array<'standard' | 'guest'>,
        actions: rail.actions.map(String),
        guestSupport: rail.guestSupport === true,
      };
    }),
  };
}

export function normalizeSellerAffiliateStatementPage(
  value: unknown
): SellerAffiliateStatementPage {
  const raw = data(value);
  const items = unwrapSellerAffiliateList(raw).map(normalizeSellerAffiliateStatementLine);
  const sourceErrors = Array.isArray(raw.sourceErrors)
    ? raw.sourceErrors.map(value => {
        const source = record(value);
        return { linkID: stringField(source, 'linkID'), code: stringField(source, 'code') };
      })
    : [];
  return {
    items,
    page: numberField(raw, 'page'),
    pageSize: numberField(raw, 'pageSize'),
    total: numberField(raw, 'total'),
    partial: raw.partial === true,
    sourceErrors,
  };
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

/** Tolerant projection: payout rails are display-only, so bad entries are dropped, never fatal. */
function normalizePayoutRails(value: unknown): SellerAffiliatePayoutRail[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(entry => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
    const rail = entry as Record<string, unknown>;
    if (typeof rail.railID !== 'string' || !rail.railID.trim()) return [];
    if (typeof rail.address !== 'string' || !rail.address.trim()) return [];
    return [
      {
        railID: rail.railID,
        address: rail.address,
        ...(typeof rail.railLabel === 'string' && rail.railLabel.trim()
          ? { railLabel: rail.railLabel }
          : {}),
      },
    ];
  });
}

export function normalizeSellerAffiliateLink(value: unknown): SellerAffiliateLink {
  const raw = data(value);
  const status = stringField(raw, 'status');
  if (status !== 'active' && status !== 'revoked')
    throw new Error('Invalid seller affiliate link status');
  const payoutRails = normalizePayoutRails(raw.payoutRails);
  return {
    id: stringField(raw, 'id'),
    programID: stringField(raw, 'programID'),
    promoterPeerID: stringField(raw, 'promoterPeerID'),
    publicToken: stringField(raw, 'publicToken'),
    publicPath: stringField(raw, 'publicPath'),
    status,
    ...(payoutRails.length ? { payoutRails } : {}),
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
  const buyerKind = stringField(raw, 'buyerKind');
  if (buyerKind !== 'peer' && buyerKind !== 'guest')
    throw new Error('Invalid seller affiliate buyer kind');
  const buyerPeerID =
    typeof raw.buyerPeerID === 'string' && raw.buyerPeerID.trim()
      ? raw.buyerPeerID.trim()
      : undefined;
  if ((buyerKind === 'peer' && !buyerPeerID) || (buyerKind === 'guest' && buyerPeerID))
    throw new Error('Invalid seller affiliate buyer identity');
  return {
    id: stringField(raw, 'id'),
    orderID: stringField(raw, 'orderID'),
    referralSessionID: stringField(raw, 'referralSessionID'),
    programID: stringField(raw, 'programID'),
    sellerPeerID: stringField(raw, 'sellerPeerID'),
    buyerKind,
    ...(buyerPeerID ? { buyerPeerID } : {}),
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
  if (
    state !== 'planned' &&
    state !== 'submitted' &&
    state !== 'confirmed' &&
    state !== 'failed' &&
    state !== 'abandoned'
  )
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
    ...(typeof raw.lastError === 'string' && raw.lastError.trim()
      ? { lastError: raw.lastError }
      : {}),
    ...(typeof raw.confirmedAt === 'string' && raw.confirmedAt.trim()
      ? { confirmedAt: raw.confirmedAt }
      : {}),
  };
}

/** Reports inconsistent cross-layer facts without silently changing their economic meaning. */
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
    return 'clawback_due';
  }

  if (isConfirmed) return 'paid';
  if (isReversed) return 'reversed';
  if (line.settlement?.state === 'failed' || line.settlement?.state === 'abandoned')
    return 'failed';
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
  confirmed: 4,
  submitted: 3,
  failed: 3,
  abandoned: 3,
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
    const hasReversed = groupLines.some(line => line.commissionLine.status === 'reversed');
    const hasActive = groupLines.some(line => line.commissionLine.status !== 'reversed');

    if (hasReversed && hasActive) {
      reportSellerAffiliateContractAnomaly(
        'mixed_reversed_and_active_commission_lines_for_order',
        groupLines[0]
      );
    }

    let displayStatus: SellerAffiliateDisplayStatus;
    if (lineStatuses.includes('clawback_due')) {
      displayStatus = 'clawback_due';
    } else if (lineStatuses.includes('paid')) {
      displayStatus = 'paid';
    } else if (!hasActive) {
      displayStatus = 'reversed';
    } else if (lineStatuses.includes('failed')) {
      displayStatus = 'failed';
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
