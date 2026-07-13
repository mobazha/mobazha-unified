// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { Contract, getAddress, Interface, type JsonRpcSigner } from 'ethers';
import { parseCanonicalPaymentCoin } from '../data/tokens';
import {
  EVM_COLLATERAL_VAULT_FUNDING_ABI,
  EVM_COLLATERAL_VAULT_PAYLOAD_TYPE,
  EVM_COLLATERAL_VAULT_RAIL_ID,
} from './constants';
import { isCanonicalPositiveIntegerAmount } from './projection';
import type { CollateralFundingTarget } from './types';

const ERC20_APPROVAL_ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
] as const;

const VAULT_FUNDING_INTERFACE = new Interface([...EVM_COLLATERAL_VAULT_FUNDING_ABI]);
const VAULT_FUND_SELECTOR = VAULT_FUNDING_INTERFACE.getFunction('fund')!.selector;
const BYTES32_PATTERN = /^0x[0-9a-fA-F]{64}$/;

export interface EvmCollateralVaultFundingPayload {
  type: typeof EVM_COLLATERAL_VAULT_PAYLOAD_TYPE;
  chainID: number;
  vaultAddress: string;
  tokenAddress: string;
  principalAddress: string;
  collateralKey: string;
  fundingKey: string;
  callData: string;
  approvalSpender: string;
  approvalAmount: string;
  obligationReference?: string;
}

export interface EvmCollateralFundingResult {
  approvalTxHash?: string;
  fundingTxHash: string;
}

export type EvmCollateralFundingValidationIssue =
  | 'payloadUnavailable'
  | 'unsupportedRail'
  | 'unsupportedPayloadType'
  | 'invalidChain'
  | 'invalidAmount'
  | 'amountMismatch'
  | 'vaultMismatch'
  | 'invalidCalldata'
  | 'invalidCollateralKey'
  | 'invalidFundingKey'
  | 'assetMismatch'
  | 'selectorMismatch'
  | 'calldataArgumentMismatch';

export function resolveEvmCollateralFundingValidationIssueKey(
  issue: EvmCollateralFundingValidationIssue
): `collectibles.collateral.funding.validation.${EvmCollateralFundingValidationIssue}` {
  return `collectibles.collateral.funding.validation.${issue}`;
}

function validationError(issue: EvmCollateralFundingValidationIssue): Error {
  return new Error(issue);
}

function objectPayload(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw validationError('payloadUnavailable');
}

function requiredString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw validationError('payloadUnavailable');
  }
  return value.trim();
}

function requireBytes32(
  value: string,
  issue: 'invalidCollateralKey' | 'invalidFundingKey'
): string {
  const trimmed = value.trim();
  if (!BYTES32_PATTERN.test(trimmed)) {
    throw validationError(issue);
  }
  return trimmed.toLowerCase();
}

function parseEvmErc20AssetID(assetID: string): { chainID: number; tokenAddress: string } | null {
  const parsed = parseCanonicalPaymentCoin(assetID.trim());
  if (!parsed || parsed.namespace !== 'eip155' || parsed.standard !== 'erc20' || !parsed.assetRef) {
    return null;
  }
  const chainRef = parsed.chainRef;
  if (!chainRef || !isCanonicalPositiveIntegerAmount(chainRef)) {
    return null;
  }
  const chainID = Number(chainRef);
  if (!Number.isSafeInteger(chainID)) {
    return null;
  }
  try {
    return { chainID, tokenAddress: getAddress(parsed.assetRef) };
  } catch {
    return null;
  }
}

function validateFundingCalldata(
  callData: string,
  expected: { collateralKey: string; fundingKey: string; amount: string }
): void {
  if (!/^0x[0-9a-fA-F]+$/.test(callData) || callData.length % 2 !== 0) {
    throw validationError('invalidCalldata');
  }
  if (callData.slice(0, 10).toLowerCase() !== VAULT_FUND_SELECTOR.toLowerCase()) {
    throw validationError('selectorMismatch');
  }
  let decoded: readonly unknown[];
  try {
    decoded = VAULT_FUNDING_INTERFACE.decodeFunctionData('fund', callData);
  } catch {
    throw validationError('calldataArgumentMismatch');
  }
  const collateralKey = String(decoded[0] ?? '').toLowerCase();
  const fundingKey = String(decoded[1] ?? '').toLowerCase();
  const amount = BigInt(String(decoded[2] ?? '0')).toString();
  if (collateralKey !== expected.collateralKey.toLowerCase()) {
    throw validationError('calldataArgumentMismatch');
  }
  if (fundingKey !== expected.fundingKey.toLowerCase()) {
    throw validationError('calldataArgumentMismatch');
  }
  if (amount !== expected.amount) {
    throw validationError('calldataArgumentMismatch');
  }
}

export function parseEvmCollateralVaultFundingPayload(
  target: CollateralFundingTarget
): EvmCollateralVaultFundingPayload {
  if ((target.railID ?? '').trim() !== EVM_COLLATERAL_VAULT_RAIL_ID) {
    throw validationError('unsupportedRail');
  }

  const payload = objectPayload(target.payload);
  if (payload.type !== EVM_COLLATERAL_VAULT_PAYLOAD_TYPE) {
    throw validationError('unsupportedPayloadType');
  }
  const chainID = Number(payload.chainID);
  if (!Number.isSafeInteger(chainID) || chainID <= 0) {
    throw validationError('invalidChain');
  }

  const approvalAmount = requiredString(payload, 'approvalAmount');
  if (!/^\d+$/.test(approvalAmount) || BigInt(approvalAmount) <= BigInt(0)) {
    throw validationError('invalidAmount');
  }
  if (approvalAmount !== target.amount) {
    throw validationError('amountMismatch');
  }

  const assetParts = parseEvmErc20AssetID(target.assetID);
  if (!assetParts) {
    throw validationError('assetMismatch');
  }

  const vaultAddress = getAddress(requiredString(payload, 'vaultAddress'));
  const approvalSpender = getAddress(requiredString(payload, 'approvalSpender'));
  if (vaultAddress !== approvalSpender || getAddress(target.destination ?? '') !== vaultAddress) {
    throw validationError('vaultMismatch');
  }

  const tokenAddress = getAddress(requiredString(payload, 'tokenAddress'));
  if (assetParts.chainID !== chainID || assetParts.tokenAddress !== tokenAddress) {
    throw validationError('assetMismatch');
  }

  const collateralKey = requireBytes32(
    requiredString(payload, 'collateralKey'),
    'invalidCollateralKey'
  );
  const fundingKey = requireBytes32(requiredString(payload, 'fundingKey'), 'invalidFundingKey');

  const callData = requiredString(payload, 'callData');
  validateFundingCalldata(callData, {
    collateralKey,
    fundingKey,
    amount: approvalAmount,
  });

  return {
    type: EVM_COLLATERAL_VAULT_PAYLOAD_TYPE,
    chainID,
    vaultAddress,
    tokenAddress,
    principalAddress: getAddress(requiredString(payload, 'principalAddress')),
    collateralKey,
    fundingKey,
    callData,
    approvalSpender,
    approvalAmount,
    obligationReference:
      typeof payload.obligationReference === 'string' && payload.obligationReference.trim()
        ? payload.obligationReference.trim()
        : undefined,
  };
}

export async function executeEvmCollateralFunding(
  signer: JsonRpcSigner,
  target: CollateralFundingTarget
): Promise<EvmCollateralFundingResult> {
  const payload = parseEvmCollateralVaultFundingPayload(target);
  const network = await signer.provider.getNetwork();
  if (network.chainId !== BigInt(payload.chainID)) {
    throw validationError('invalidChain');
  }
  const principal = getAddress(await signer.getAddress());
  if (principal !== payload.principalAddress) {
    throw validationError('vaultMismatch');
  }

  const amount = BigInt(payload.approvalAmount);
  const token = new Contract(payload.tokenAddress, ERC20_APPROVAL_ABI, signer);
  let approvalTxHash: string | undefined;
  const allowance = BigInt((await token.allowance(principal, payload.approvalSpender)).toString());
  if (allowance < amount) {
    await token.approve.estimateGas(payload.approvalSpender, amount);
    const approval = await token.approve(payload.approvalSpender, amount);
    const receipt = await approval.wait();
    if (!receipt || receipt.status !== 1) throw validationError('invalidAmount');
    approvalTxHash = receipt.hash;
  }

  const request = { to: payload.vaultAddress, data: payload.callData };
  await signer.estimateGas(request);
  const funding = await signer.sendTransaction(request);
  const receipt = await funding.wait();
  if (!receipt || receipt.status !== 1) throw validationError('invalidAmount');
  return { approvalTxHash, fundingTxHash: receipt.hash };
}
