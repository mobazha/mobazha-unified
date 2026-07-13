// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetCapabilities = vi.hoisted(() => vi.fn());
const mockListAccounts = vi.hoisted(() => vi.fn());
const mockGetAccount = vi.hoisted(() => vi.fn());

vi.mock('@mobazha/core/services/api/collateral', () => ({
  collateralApi: {
    getCapabilities: mockGetCapabilities,
    listAccounts: mockListAccounts,
    getAccount: mockGetAccount,
    openAccount: vi.fn(),
    prepareFundingTarget: vi.fn(),
    reconcileFunding: vi.fn(),
  },
}));

import { useCollateralOperator } from '@mobazha/core/hooks/useCollateralOperator';

const sellerPeerID = 'QmSellerPeerID1234567890abcdefghijklmnop';
const otherPeerID = 'QmOtherPeerID1234567890abcdefghijklmnop';

const capabilities = {
  available: true,
  rail: {
    id: 'io.mobazha.collateral.evm-vault',
    version: '1',
    custodyModel: 'contract-vault' as const,
    assets: ['crypto:eip155:56:erc20:0x0000000000000000000000000000000000000001'],
    supportsFundingTargets: true,
    supportsFundingObserve: true,
    supportsPrincipalRelease: true,
    supportsClaimSlash: true,
    supportsReconciliation: true,
    hasReceiptVerification: true,
  },
};

const account = {
  collateralID: 'col-1',
  providerID: 'io.mobazha.collectibles',
  resourceID: 'dep-1',
  assetID: 'crypto:eip155:56:erc20:0x0000000000000000000000000000000000000001',
  requiredAmount: '100',
  policyID: 'io.mobazha.collectibles.source-custody',
  policyVersion: '1',
  fundedAmount: '100',
  availableAmount: '100',
  revision: 2,
  state: 'active',
  expiresAt: '2027-01-01T00:00:00.000Z',
};

describe('useCollateralOperator scope hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCapabilities.mockResolvedValue(capabilities);
    mockListAccounts.mockResolvedValue({ items: [account] });
    mockGetAccount.mockResolvedValue(account);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resets principal-scoped state when scopeKey changes', async () => {
    const { result, rerender } = renderHook(
      ({ scopeKey }) =>
        useCollateralOperator({
          enabled: true,
          scopeKey,
        }),
      { initialProps: { scopeKey: sellerPeerID } }
    );

    await waitFor(() => {
      expect(result.current.capabilities).toEqual(capabilities);
    });

    await act(async () => {
      await result.current.findResourceAccount({
        providerID: account.providerID,
        resourceID: account.resourceID,
        assetID: account.assetID,
        requiredAmount: account.requiredAmount,
        policyID: account.policyID,
        policyVersion: account.policyVersion,
      });
    });

    expect(result.current.account).toEqual(account);

    rerender({ scopeKey: otherPeerID });

    await waitFor(() => {
      expect(result.current.account).toBeNull();
      expect(result.current.bindingMismatch).toBe(false);
      expect(result.current.fundingTarget).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  it('ignores async results that complete after scope changes', async () => {
    const deferreds: Array<(value: typeof capabilities) => void> = [];
    mockGetCapabilities.mockImplementation(
      () =>
        new Promise(resolve => {
          deferreds.push(resolve);
        })
    );

    const { result, rerender } = renderHook(
      ({ scopeKey }) =>
        useCollateralOperator({
          enabled: true,
          scopeKey,
        }),
      { initialProps: { scopeKey: sellerPeerID } }
    );

    await waitFor(() => {
      expect(deferreds).toHaveLength(1);
    });

    rerender({ scopeKey: otherPeerID });

    await waitFor(() => {
      expect(deferreds).toHaveLength(2);
      expect(result.current.capabilities).toBeNull();
    });

    await act(async () => {
      deferreds[0]?.(capabilities);
      await Promise.resolve();
    });

    expect(result.current.capabilities).toBeNull();
  });

  it('clears exposed state when operator becomes disabled', async () => {
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        useCollateralOperator({
          enabled,
          scopeKey: sellerPeerID,
        }),
      { initialProps: { enabled: true } }
    );

    await waitFor(() => {
      expect(result.current.capabilities).toEqual(capabilities);
    });

    await act(async () => {
      await result.current.findResourceAccount({
        providerID: account.providerID,
        resourceID: account.resourceID,
        assetID: account.assetID,
        requiredAmount: account.requiredAmount,
        policyID: account.policyID,
        policyVersion: account.policyVersion,
      });
    });

    expect(result.current.account).toEqual(account);

    rerender({ enabled: false });

    await waitFor(() => {
      expect(result.current.account).toBeNull();
      expect(result.current.capabilities).toBeNull();
      expect(result.current.loading).toBe(false);
    });
  });
});
