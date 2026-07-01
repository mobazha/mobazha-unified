import { describe, expect, it } from 'vitest';
import {
  normalizeAgentApprovalRecord,
  parseApprovalRequiredResult,
} from '../../../services/ai/approvalService';

describe('parseApprovalRequiredResult', () => {
  it('returns null for non-approval payloads', () => {
    expect(parseApprovalRequiredResult(null)).toBeNull();
    expect(parseApprovalRequiredResult({ status: 'ok' })).toBeNull();
  });

  it('parses approval_required tool results', () => {
    const parsed = parseApprovalRequiredResult({
      status: 'approval_required',
      message: 'needs approval',
      approval: {
        id: 'appr_1',
        action: 'listings_create',
        summary: 'Create listing',
        requestHash: 'hash_1',
      },
    });
    expect(parsed?.approval.id).toBe('appr_1');
    expect(parsed?.approval.action).toBe('listings_create');
  });
});

describe('normalizeAgentApprovalRecord', () => {
  it('maps snake_case REST fields to camelCase records', () => {
    const normalized = normalizeAgentApprovalRecord({
      id: 'appr_1',
      tenant_id: 'tenant_a',
      skill_id: 'product.import',
      action: 'listings_create',
      summary: 'Create listing',
      request_hash: 'hash_1',
      status: 'pending',
      created_at: '2026-01-01T00:00:00Z',
    });
    expect(normalized.tenantId).toBe('tenant_a');
    expect(normalized.skillId).toBe('product.import');
    expect(normalized.requestHash).toBe('hash_1');
    expect(normalized.createdAt).toBe('2026-01-01T00:00:00Z');
  });
});
