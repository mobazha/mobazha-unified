// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { NODE_API } from '../../config/apiPaths';
import type {
  CollateralAccount,
  CollateralAccountListInput,
  CollateralAccountOpenInput,
  CollateralAccountsResult,
  CollateralCapabilities,
  CollateralFundingInput,
  CollateralFundingTarget,
} from '../../collateral/types';
import { ApiError } from './client';
import { nodeAuthGet, nodeAuthPost } from './helpers';

interface RawCollateralCapabilities {
  available: boolean;
  rail?: Omit<NonNullable<CollateralCapabilities['rail']>, 'assets'> & {
    assets?: string[] | null;
  };
}

function normalizeCapabilities(value: RawCollateralCapabilities): CollateralCapabilities {
  if (!value.available || !value.rail) return { available: false };
  return {
    available: true,
    rail: {
      ...value.rail,
      assets: Array.isArray(value.rail.assets) ? value.rail.assets.filter(Boolean) : [],
    },
  };
}

export async function getCollateralCapabilities(): Promise<CollateralCapabilities> {
  try {
    const result = await nodeAuthGet<RawCollateralCapabilities>(NODE_API.COLLATERAL_CAPABILITIES);
    return normalizeCapabilities(result);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 503)) {
      return { available: false };
    }
    throw error;
  }
}

export function openCollateralAccount(
  input: CollateralAccountOpenInput
): Promise<CollateralAccount> {
  return nodeAuthPost<CollateralAccount>(NODE_API.COLLATERAL_ACCOUNTS, input);
}

export function listCollateralAccounts(
  input: CollateralAccountListInput
): Promise<CollateralAccountsResult> {
  const query = new URLSearchParams({
    providerID: input.providerID.trim(),
    resourceID: input.resourceID.trim(),
  });
  return nodeAuthGet<CollateralAccountsResult>(`${NODE_API.COLLATERAL_ACCOUNTS}?${query}`);
}

export function getCollateralAccount(collateralID: string): Promise<CollateralAccount> {
  return nodeAuthGet<CollateralAccount>(
    NODE_API.COLLATERAL_ACCOUNTS_BY_COLLATERAL_ID(collateralID.trim())
  );
}

export function prepareCollateralFundingTarget(
  collateralID: string,
  input: CollateralFundingInput
): Promise<CollateralFundingTarget> {
  return nodeAuthPost<CollateralFundingTarget>(
    NODE_API.COLLATERAL_ACCOUNTS_FUNDING_TARGET(collateralID.trim()),
    input
  );
}

export function reconcileCollateralFunding(collateralID: string): Promise<CollateralAccount> {
  return nodeAuthPost<CollateralAccount>(
    NODE_API.COLLATERAL_ACCOUNTS_FUNDING_RECONCILE(collateralID.trim()),
    {}
  );
}

export const collateralApi = {
  getCapabilities: getCollateralCapabilities,
  listAccounts: listCollateralAccounts,
  openAccount: openCollateralAccount,
  getAccount: getCollateralAccount,
  prepareFundingTarget: prepareCollateralFundingTarget,
  reconcileFunding: reconcileCollateralFunding,
};
