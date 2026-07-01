import { describe, expect, it } from 'vitest';
import { aiStatusSupportsVision, type AIStatus } from '../../../services/api/aiSettings';

function status(overrides: Partial<AIStatus>): AIStatus {
  return {
    available: true,
    source: 'platform',
    daily_limit: 0,
    daily_used: 0,
    byok_configured: false,
    ...overrides,
  };
}

describe('aiStatusSupportsVision', () => {
  it('uses vision_available whenever the backend reports it', () => {
    expect(aiStatusSupportsVision(status({ source: 'byok', vision_available: false }))).toBe(false);
    expect(aiStatusSupportsVision(status({ source: 'platform', vision_available: true }))).toBe(
      true
    );
  });

  it('falls back to sovereign supports_vision when vision_available is absent', () => {
    expect(aiStatusSupportsVision(status({ source: 'byok', supports_vision: false }))).toBe(false);
    expect(aiStatusSupportsVision(status({ source: 'byok' }))).toBe(true);
  });
});
