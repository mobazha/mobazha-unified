// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../services/api/client';

const mockNodeAuthGet = vi.fn();
const mockNodeAuthPost = vi.fn();

vi.mock('../../../services/api/helpers', () => ({
  nodeAuthGet: (...args: unknown[]) => mockNodeAuthGet(...args),
  nodeAuthPost: (...args: unknown[]) => mockNodeAuthPost(...args),
}));

describe('collateral API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes configured rail capabilities', async () => {
    const { getCollateralCapabilities } = await import('../../../services/api/collateral');
    mockNodeAuthGet.mockResolvedValueOnce({
      available: true,
      rail: {
        id: 'io.mobazha.collateral.evm-vault',
        version: '1.0.0',
        custodyModel: 'contract-vault',
        assets: null,
        supportsFundingTargets: true,
        supportsFundingObserve: true,
        supportsPrincipalRelease: true,
        supportsClaimSlash: true,
        supportsReconciliation: true,
        hasReceiptVerification: true,
      },
    });

    const result = await getCollateralCapabilities();

    expect(mockNodeAuthGet).toHaveBeenCalledWith('/collateral/capabilities');
    expect(result.available).toBe(true);
    expect(result.rail?.assets).toEqual([]);
  });

  it('fails closed for older or unconfigured nodes', async () => {
    const { getCollateralCapabilities } = await import('../../../services/api/collateral');
    mockNodeAuthGet.mockRejectedValueOnce(new ApiError('not found', 404));
    await expect(getCollateralCapabilities()).resolves.toEqual({ available: false });

    mockNodeAuthGet.mockRejectedValueOnce(new ApiError('unavailable', 503));
    await expect(getCollateralCapabilities()).resolves.toEqual({ available: false });
  });

  it('routes account and funding operations through the local node', async () => {
    const {
      getCollateralAccount,
      listCollateralAccounts,
      openCollateralAccount,
      prepareCollateralFundingTarget,
      reconcileCollateralFunding,
    } = await import('../../../services/api/collateral');
    const account = {
      collateralID: 'col-1',
      providerID: 'io.mobazha.collectibles',
      resourceID: 'source-1',
      assetID: 'crypto:eip155:31337:erc20:0x0000000000000000000000000000000000000001',
      requiredAmount: '100',
      fundedAmount: '0',
      availableAmount: '0',
      policyID: 'io.mobazha.collectibles.source-custody',
      policyVersion: '1',
      revision: 1,
      state: 'pending-funding',
      expiresAt: '2026-07-07T00:00:00Z',
    };
    mockNodeAuthPost.mockResolvedValue(account);
    mockNodeAuthGet.mockResolvedValue(account);

    const openInput = {
      providerID: account.providerID,
      resourceID: account.resourceID,
      assetID: account.assetID,
      requiredAmount: account.requiredAmount,
      policyID: account.policyID,
      policyVersion: account.policyVersion,
      idempotencyKey: 'open-source-1',
      expiresAt: account.expiresAt,
    };
    await openCollateralAccount(openInput);
    mockNodeAuthGet.mockResolvedValueOnce({ items: [account] });
    await listCollateralAccounts({
      providerID: ' io.mobazha.collectibles ',
      resourceID: ' source-1 ',
    });
    await getCollateralAccount(' col-1 ');
    await prepareCollateralFundingTarget(' col-1 ', {
      principalDestination: '0x0000000000000000000000000000000000000002',
      idempotencyKey: 'fund-source-1',
    });
    await reconcileCollateralFunding(' col-1 ');

    expect(mockNodeAuthPost).toHaveBeenNthCalledWith(1, '/collateral/accounts', openInput);
    expect(mockNodeAuthGet).toHaveBeenNthCalledWith(
      1,
      '/collateral/accounts?providerID=io.mobazha.collectibles&resourceID=source-1'
    );
    expect(mockNodeAuthGet).toHaveBeenCalledWith('/collateral/accounts/col-1');
    expect(mockNodeAuthPost).toHaveBeenNthCalledWith(
      2,
      '/collateral/accounts/col-1/funding-target',
      {
        principalDestination: '0x0000000000000000000000000000000000000002',
        idempotencyKey: 'fund-source-1',
      }
    );
    expect(mockNodeAuthPost).toHaveBeenNthCalledWith(
      3,
      '/collateral/accounts/col-1/funding/reconcile',
      {}
    );
  });
});
