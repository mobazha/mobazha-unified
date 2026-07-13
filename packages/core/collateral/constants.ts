// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/** Collateral provider for source-custody collectible deposits. */
export const COLLECTIBLES_COLLATERAL_PROVIDER_ID = 'io.mobazha.collectibles';

/** Matches mobazha_hosting internal/collectibles/source_deposit.go canonical policy. */
export const COLLECTIBLES_SOURCE_CUSTODY_POLICY_ID = 'io.mobazha.collectibles.source-custody';

export const COLLECTIBLES_SOURCE_CUSTODY_POLICY_VERSION = '1';

/** Node collateral funding rail for EVM ERC-20 vault deposits. */
export const EVM_COLLATERAL_VAULT_RAIL_ID = 'evm-erc20-collateral-vault';

export const EVM_COLLATERAL_VAULT_PAYLOAD_TYPE = 'mobazha-evm-collateral-vault/v1' as const;

/** Matches mobazha collateral contract adapter fund(bytes32,bytes32,uint256). */
export const EVM_COLLATERAL_VAULT_FUNDING_ABI = [
  'function fund(bytes32 collateralKey, bytes32 fundingKey, uint256 amount)',
] as const;
