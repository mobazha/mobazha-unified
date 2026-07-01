import BigNumber from 'bignumber.js';
import type { AgentApprovalStatus } from '../types/agentApproval';
import type { ProductImportDraft, ProductImportWorkbenchRow } from '../types/productImport';

export type ProductImportMissingField = 'title' | 'price' | 'quantity';

/** User-facing row lifecycle — maps backend states to merchant mental model. */
export type ProductImportUserRowState = 'needs_fix' | 'ready' | 'applied' | 'failed' | 'rejected';

export type ProductImportUserFilter = 'all' | 'needs_fix' | 'ready' | 'applied' | 'failed';

export function shouldSyncProductImportDraftEditor(
  currentProposalArtifactId: string,
  nextProposalArtifactId: string,
  dirty: boolean
): boolean {
  return currentProposalArtifactId !== nextProposalArtifactId || !dirty;
}

export type ProductImportApprovalExecutionMode =
  | 'create_and_apply'
  | 'approve_and_apply'
  | 'apply'
  | 'none';

export function productImportApprovalExecutionMode(
  status?: AgentApprovalStatus
): ProductImportApprovalExecutionMode {
  switch (status) {
    case 'pending':
      return 'approve_and_apply';
    case 'approved':
    case 'apply_failed':
      return 'apply';
    case 'applying':
    case 'applied':
      return 'none';
    case 'rejected':
    case 'superseded':
    case undefined:
      return 'create_and_apply';
  }
}

export function missingProductImportDraftFields(
  row: ProductImportWorkbenchRow
): ProductImportMissingField[] {
  const fields: ProductImportMissingField[] = [];
  if (!row.draft?.title?.trim()) fields.push('title');
  const amountMinor = row.draft?.price?.amountMinor;
  const quantity = row.draft?.inventory?.quantity;
  if (amountMinor == null || !Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    fields.push('price');
  }
  if (quantity == null || !Number.isSafeInteger(quantity) || quantity < 0) {
    fields.push('quantity');
  }
  return fields;
}

export function isProductImportDraftComplete(row: ProductImportWorkbenchRow): boolean {
  return missingProductImportDraftFields(row).length === 0;
}

export function getProductImportUserRowState(
  row: ProductImportWorkbenchRow
): ProductImportUserRowState {
  const approvalStatus = row.approval?.status;
  if (approvalStatus === 'applied') return 'applied';
  if (approvalStatus === 'apply_failed') return 'failed';
  if (approvalStatus === 'rejected') return 'rejected';
  if (!isProductImportDraftComplete(row)) return 'needs_fix';
  return 'ready';
}

export function matchesProductImportUserFilter(
  row: ProductImportWorkbenchRow,
  filter: ProductImportUserFilter
): boolean {
  if (filter === 'all') return true;
  return getProductImportUserRowState(row) === filter;
}

export function countProductImportRowsByUserState(
  rows: ProductImportWorkbenchRow[]
): Record<ProductImportUserFilter, number> {
  const counts: Record<ProductImportUserFilter, number> = {
    all: rows.length,
    needs_fix: 0,
    ready: 0,
    applied: 0,
    failed: 0,
  };
  for (const row of rows) {
    const state = getProductImportUserRowState(row);
    if (state !== 'rejected') {
      counts[state] += 1;
    }
  }
  return counts;
}

export function productImportMajorAmountInput(amountMinor?: number, divisibility = 2): string {
  if (amountMinor == null || !Number.isSafeInteger(amountMinor) || amountMinor < 0) return '';
  return new BigNumber(amountMinor).shiftedBy(-divisibility).toFixed();
}

export function productImportMinorAmountFromInput(
  raw: string,
  divisibility = 2
): number | undefined {
  const value = new BigNumber(raw.trim());
  if (!value.isFinite() || value.isNegative()) return undefined;
  const minor = value.shiftedBy(divisibility);
  if (!minor.isInteger() || minor.gt(Number.MAX_SAFE_INTEGER)) return undefined;
  return minor.toNumber();
}

export function productImportQuantityFromInput(raw: string): number | undefined {
  const normalized = raw.trim();
  if (!/^\d+$/.test(normalized)) return undefined;
  const value = new BigNumber(normalized);
  if (!value.isInteger() || value.gt(Number.MAX_SAFE_INTEGER)) return undefined;
  return value.toNumber();
}

const PRODUCT_IMPORT_MISSING_FIELD_ORDER: ProductImportMissingField[] = [
  'title',
  'price',
  'quantity',
];

export function productImportDraftCurrencyCode(
  draft: ProductImportDraft | undefined,
  fallback = 'USD'
): string {
  return draft?.price?.currencyCode?.trim() || fallback;
}

/** Unique missing fields across rows that still need merchant input. */
export function aggregateMissingProductImportFields(
  rows: ProductImportWorkbenchRow[]
): ProductImportMissingField[] {
  const set = new Set<ProductImportMissingField>();
  for (const row of rows) {
    if (getProductImportUserRowState(row) !== 'needs_fix') continue;
    for (const field of missingProductImportDraftFields(row)) {
      set.add(field);
    }
  }
  return PRODUCT_IMPORT_MISSING_FIELD_ORDER.filter(field => set.has(field));
}

export function isImageImportSource(contentType?: string, sourceName?: string): boolean {
  const type = (contentType || '').toLowerCase();
  if (type.startsWith('image/')) return true;
  const name = (sourceName || '').toLowerCase();
  return /\.(jpe?g|png|gif|webp|bmp|heic|heif)$/.test(name);
}
