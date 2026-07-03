import { describe, expect, it } from 'vitest';
import { extractProductImportRunId } from '../../../services/ai/productImportToolResult';

describe('extractProductImportRunId', () => {
  it('reads run id from API envelope', () => {
    expect(
      extractProductImportRunId({
        data: { skillRun: { id: 'run_abc', skillId: 'product.import' } },
      })
    ).toBe('run_abc');
  });

  it('reads run id from JSON string payloads', () => {
    expect(
      extractProductImportRunId(JSON.stringify({ data: { skillRun: { id: 'run_json' } } }))
    ).toBe('run_json');
  });

  it('returns null for tool errors', () => {
    expect(extractProductImportRunId({ error: 'failed' })).toBeNull();
  });
});
