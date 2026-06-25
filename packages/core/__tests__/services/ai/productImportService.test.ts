import { describe, expect, it } from 'vitest';
import {
  formatProductImportDraftPrice,
  normalizeProductImportIngestResult,
  normalizeProductImportWorkbench,
  productImportDraftQuantity,
} from '../../../services/ai/productImportService';

describe('normalizeProductImportIngestResult', () => {
  it('maps snake_case skill run and artifacts to camelCase', () => {
    const result = normalizeProductImportIngestResult({
      skillRun: {
        id: 'run_1',
        tenant_id: 't1',
        skill_id: 'product.import',
        status: 'waiting_for_review',
      },
      sourceArtifacts: [
        {
          id: 'art_src',
          kind: 'source_material',
          content_type: 'text/csv',
          source_name: 'supplier.csv',
        },
      ],
      candidateArtifacts: [{ id: 'art_cand' }],
      proposalArtifacts: [{ id: 'art_prop', status: 'needs_review' }],
    });
    expect(result.skillRun.id).toBe('run_1');
    expect(result.skillRun.skillId).toBe('product.import');
    expect(result.sourceArtifacts[0].contentType).toBe('text/csv');
    expect(result.proposalArtifacts[0].id).toBe('art_prop');
  });
});

describe('normalizeProductImportWorkbench', () => {
  it('preserves workbench rows and counts', () => {
    const wb = normalizeProductImportWorkbench({
      skillRun: { id: 'run_1', status: 'waiting_for_review' },
      sources: [{ artifactId: 'art_src', status: 'ready', sourceName: 'supplier.csv' }],
      rows: [
        {
          proposalArtifactId: 'art_prop',
          status: 'needs_review',
          rowNumber: 1,
          draft: { title: 'Linen Tote' },
        },
      ],
      counts: { proposal: 1, source: 1 },
    });
    expect(wb.rows[0].draft?.title).toBe('Linen Tote');
    expect(wb.counts.proposal).toBe(1);
  });
});

describe('formatProductImportDraftPrice', () => {
  it('formats minor units with currency code', () => {
    const label = formatProductImportDraftPrice({
      price: { amountMinor: 4500, currencyCode: 'USD', divisibility: 2 },
    });
    expect(label).toMatch(/45\.00|45,00/);
    expect(label).toMatch(/USD|\$/);
  });

  it('returns dash when price missing', () => {
    expect(formatProductImportDraftPrice(undefined)).toBe('—');
  });
});

describe('productImportDraftQuantity', () => {
  it('returns inventory quantity or dash', () => {
    expect(productImportDraftQuantity({ inventory: { quantity: 12 } })).toBe('12');
    expect(productImportDraftQuantity({})).toBe('—');
  });
});
