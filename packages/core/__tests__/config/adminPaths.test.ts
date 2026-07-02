import { describe, expect, it } from 'vitest';

import { getAdminStorePaymentsPath } from '../../config/adminPaths';

describe('getAdminStorePaymentsPath', () => {
  it('returns the capability-driven payments path', () => {
    expect(getAdminStorePaymentsPath()).toBe('/admin/payments');
  });
});
