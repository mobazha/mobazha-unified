import { describe, expect, it, vi } from 'vitest';

vi.mock('../../config/env', () => ({
  isSovereignMode: vi.fn(() => false),
}));

import { isSovereignMode } from '../../config/env';
import {
  getAdminStorePaymentsPath,
  getAdminFinancePath,
  getAdminXmrWalletPath,
  getAdminXmrWithdrawPath,
  getAdminXmrSecretsPath,
  getAdminXmrTransfersPath,
} from '../../config/adminPaths';

describe('getAdminStorePaymentsPath', () => {
  it('returns SaaS payments path by default', () => {
    vi.mocked(isSovereignMode).mockReturnValue(false);
    expect(getAdminStorePaymentsPath()).toBe('/admin/payments');
  });

  it('returns finance path in sovereign mode', () => {
    vi.mocked(isSovereignMode).mockReturnValue(true);
    expect(getAdminStorePaymentsPath()).toBe('/admin/finance');
  });
});

describe('getAdminFinancePath', () => {
  it('returns sovereign funds hub path', () => {
    expect(getAdminFinancePath()).toBe('/admin/finance');
  });
});

describe('getAdminXmrPaths', () => {
  it('returns canonical finance sub-routes', () => {
    expect(getAdminXmrWalletPath()).toBe('/admin/finance/xmr-wallet');
    expect(getAdminXmrWithdrawPath()).toBe('/admin/finance/xmr-withdraw');
    expect(getAdminXmrSecretsPath()).toBe('/admin/finance/xmr-secrets');
    expect(getAdminXmrTransfersPath()).toBe('/admin/finance/xmr-transfers');
  });
});
