import { describe, expect, it } from 'vitest';
import {
  aggregateMissingProductImportFields,
  missingProductImportDraftFields,
  productImportApprovalExecutionMode,
  productImportMajorAmountInput,
  productImportMinorAmountFromInput,
  productImportQuantityFromInput,
  shouldSyncProductImportDraftEditor,
} from '../../utils/productImportRowState';

describe('product import numeric inputs', () => {
  it('converts decimal prices to minor units without binary float drift', () => {
    expect(productImportMinorAmountFromInput('0.29', 2)).toBe(29);
    expect(productImportMinorAmountFromInput('123456789.01', 2)).toBe(12345678901);
    expect(productImportMajorAmountInput(29, 2)).toBe('0.29');
  });

  it('rejects unsupported precision and unsafe values', () => {
    expect(productImportMinorAmountFromInput('1.001', 2)).toBeUndefined();
    expect(productImportMinorAmountFromInput('-1', 2)).toBeUndefined();
    expect(productImportMinorAmountFromInput('90071992547409.92', 2)).toBeUndefined();
  });

  it('accepts only safe non-negative integer quantities', () => {
    expect(productImportQuantityFromInput('12')).toBe(12);
    expect(productImportQuantityFromInput('1.5')).toBeUndefined();
    expect(productImportQuantityFromInput('-1')).toBeUndefined();
    expect(productImportQuantityFromInput('9007199254740992')).toBeUndefined();
  });
});

describe('shouldSyncProductImportDraftEditor', () => {
  it('preserves dirty input across polling refreshes for the same proposal', () => {
    expect(shouldSyncProductImportDraftEditor('proposal-1', 'proposal-1', true)).toBe(false);
  });

  it('syncs clean refreshes and proposal switches', () => {
    expect(shouldSyncProductImportDraftEditor('proposal-1', 'proposal-1', false)).toBe(true);
    expect(shouldSyncProductImportDraftEditor('proposal-1', 'proposal-2', true)).toBe(true);
  });
});

describe('missingProductImportDraftFields', () => {
  it('treats invalid persisted numeric values as missing', () => {
    expect(
      missingProductImportDraftFields({
        proposalArtifactId: 'proposal-1',
        status: 'needs_review',
        draft: {
          title: 'Product',
          price: { amountMinor: -1, currencyCode: 'USD', divisibility: 2 },
          inventory: { quantity: Number.MAX_SAFE_INTEGER + 1 },
        },
      })
    ).toEqual(['price', 'quantity']);
  });
});

describe('aggregateMissingProductImportFields', () => {
  it('returns unique missing fields only for rows that need fixes', () => {
    expect(
      aggregateMissingProductImportFields([
        {
          proposalArtifactId: 'proposal-1',
          status: 'needs_review',
          draft: { title: 'A', price: { amountMinor: 100, currencyCode: 'USD', divisibility: 2 } },
        },
        {
          proposalArtifactId: 'proposal-2',
          status: 'needs_review',
          draft: { title: 'B' },
        },
        {
          proposalArtifactId: 'proposal-3',
          status: 'applied',
          draft: { title: 'C' },
        },
      ])
    ).toEqual(['price', 'quantity']);
  });
});

describe('productImportApprovalExecutionMode', () => {
  it('uses apply-only for approvals that have already been decided', () => {
    expect(productImportApprovalExecutionMode('approved')).toBe('apply');
    expect(productImportApprovalExecutionMode('apply_failed')).toBe('apply');
  });

  it('does not repeat terminal or in-flight applications', () => {
    expect(productImportApprovalExecutionMode('applying')).toBe('none');
    expect(productImportApprovalExecutionMode('applied')).toBe('none');
  });

  it('creates a fresh approval after rejection or supersession', () => {
    expect(productImportApprovalExecutionMode('rejected')).toBe('create_and_apply');
    expect(productImportApprovalExecutionMode('superseded')).toBe('create_and_apply');
    expect(productImportApprovalExecutionMode()).toBe('create_and_apply');
  });
});
