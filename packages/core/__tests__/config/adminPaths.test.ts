import { describe, expect, it, vi } from 'vitest';

vi.mock('../../config/env', () => ({
  isOutpostMode: vi.fn(() => false),
}));

import { isOutpostMode } from '../../config/env';
import { getAdminStorePaymentsPath } from '../../config/adminPaths';

describe('getAdminStorePaymentsPath', () => {
  it('returns SaaS payments path by default', () => {
    vi.mocked(isOutpostMode).mockReturnValue(false);
    expect(getAdminStorePaymentsPath()).toBe('/admin/payments');
  });

  it('returns finance path in outpost mode', () => {
    vi.mocked(isOutpostMode).mockReturnValue(true);
    expect(getAdminStorePaymentsPath()).toBe('/admin/finance');
  });
});
