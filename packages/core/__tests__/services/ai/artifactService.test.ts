import { describe, expect, it } from 'vitest';
import { normalizeAgentArtifactRecord } from '../../../services/ai/artifactService';

describe('normalizeAgentArtifactRecord', () => {
  it('maps snake_case REST fields to camelCase records', () => {
    const normalized = normalizeAgentArtifactRecord({
      id: 'art_1',
      tenant_id: 'tenant_a',
      kind: 'source_material',
      status: 'ready',
      name: 'supplier paste',
      content_type: 'text/plain',
      summary: 'Three hoodie variants',
      created_at: '2026-01-01T00:00:00Z',
    });
    expect(normalized.tenantId).toBe('tenant_a');
    expect(normalized.contentType).toBe('text/plain');
    expect(normalized.summary).toBe('Three hoodie variants');
  });
});
