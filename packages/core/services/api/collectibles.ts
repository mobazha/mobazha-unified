// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { HOSTING_API } from '../../config/apiPaths';
import { ApiError } from './client';
import { hostingGet, hostingPost, hostingPut } from './helpers';
import type {
  CollectibleBurnTx,
  CollectibleHubSlot,
  CollectibleNFT,
  CollectiblePendingMintRecoveryReport,
  CollectiblePrimarySale,
  CollectiblePrimarySaleReleaseRetryResult,
  CollectibleRedemption,
  CollectibleSourceDeposit,
  CollectiblesPagedResult,
} from '../../collectibles/types';

interface CollectibleNFTProjection {
  nft?: CollectibleNFT;
  slot?: CollectibleHubSlot;
  mintExplorerURL?: string;
  mintTxExplorerURL?: string;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    qs.set(key, String(value));
  }
  const serialized = qs.toString();
  return serialized ? `?${serialized}` : '';
}

function isCollectibleNFTProjection(value: unknown): value is CollectibleNFTProjection {
  const nft = (value as CollectibleNFTProjection | null)?.nft;
  return (
    value !== null &&
    typeof value === 'object' &&
    'nft' in value &&
    nft !== null &&
    typeof nft === 'object'
  );
}

function normalizeCollectibleNFT(value: CollectibleNFT | CollectibleNFTProjection): CollectibleNFT {
  if (isCollectibleNFTProjection(value) && value.nft) {
    return {
      ...value.nft,
      hubSlot: value.slot,
      mintExplorerURL: value.mintExplorerURL ?? value.nft.mintExplorerURL,
      mintTxExplorerURL: value.mintTxExplorerURL ?? value.nft.mintTxExplorerURL,
    };
  }
  return value as CollectibleNFT;
}

export async function listCollectibleHubSlots(params?: {
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<CollectiblesPagedResult<CollectibleHubSlot>> {
  const query = buildQuery({
    status: params?.status,
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 20,
  });
  return hostingGet<CollectiblesPagedResult<CollectibleHubSlot>>(
    `${HOSTING_API.COLLECTIBLES_HUB_SLOTS}${query}`
  );
}

export async function getCollectibleHubSlot(id: string): Promise<CollectibleHubSlot> {
  return hostingGet<CollectibleHubSlot>(HOSTING_API.COLLECTIBLES_HUB_SLOT(id));
}

export async function intakeCollectibleHubSlot(body: {
  issuerPeerID?: string;
  currentHolder?: string;
  grade?: string;
  serial?: string;
  certNumber: string;
  photos?: string[];
  hubLocation?: string;
  tokenStandard?: string;
}): Promise<CollectibleHubSlot> {
  return hostingPost<CollectibleHubSlot>(HOSTING_API.COLLECTIBLES_HUB_INTAKE, body);
}

export async function rejectCollectibleHubSlot(id: string): Promise<CollectibleHubSlot> {
  return hostingPost<CollectibleHubSlot>(HOSTING_API.COLLECTIBLES_HUB_SLOT_REJECT(id), {});
}

export async function mintCollectibleHubSlot(
  id: string,
  body?: { holder?: string; royaltyBps?: number }
): Promise<CollectibleNFT> {
  const result = await hostingPost<CollectibleNFT | CollectibleNFTProjection>(
    HOSTING_API.COLLECTIBLES_HUB_SLOT_MINT(id),
    body ?? {}
  );
  return normalizeCollectibleNFT(result);
}

export async function listCollectibleNFTs(params?: {
  page?: number;
  pageSize?: number;
}): Promise<CollectiblesPagedResult<CollectibleNFT>> {
  const query = buildQuery({
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 20,
  });
  const result = await hostingGet<
    CollectiblesPagedResult<CollectibleNFT | CollectibleNFTProjection>
  >(`${HOSTING_API.COLLECTIBLES_NFTS}${query}`);
  return {
    ...result,
    items: result.items.map(normalizeCollectibleNFT),
  };
}

export async function getCollectibleNFT(mint: string): Promise<CollectibleNFT> {
  const result = await hostingGet<CollectibleNFT | CollectibleNFTProjection>(
    HOSTING_API.COLLECTIBLES_NFT(mint)
  );
  return normalizeCollectibleNFT(result);
}

export async function bindCollectibleWallet(body: {
  wallet: string;
  nftMint?: string;
}): Promise<{ tenantID?: string; userID?: string; wallet: string; chain?: string }> {
  return hostingPost(HOSTING_API.COLLECTIBLES_WALLETS, body);
}

export async function buildCollectibleBurnTx(
  mint: string,
  holder: string
): Promise<CollectibleBurnTx> {
  return hostingPost<CollectibleBurnTx>(HOSTING_API.COLLECTIBLES_NFT_BURN_TX(mint), { holder });
}

export async function createCollectibleRedemption(body: {
  nftMint: string;
  requesterWallet: string;
  burnTxSignature: string;
  shipToEncrypted: string;
}): Promise<CollectibleRedemption> {
  return hostingPost<CollectibleRedemption>(HOSTING_API.COLLECTIBLES_REDEMPTIONS, body);
}

export async function getCollectibleRedemption(id: string): Promise<CollectibleRedemption> {
  return hostingGet<CollectibleRedemption>(HOSTING_API.COLLECTIBLES_REDEMPTION(id));
}

export async function listCollectibleRedemptions(params?: {
  page?: number;
  pageSize?: number;
  nftMint?: string;
  status?: string;
}): Promise<CollectiblesPagedResult<CollectibleRedemption>> {
  const query = buildQuery({
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 20,
    nftMint: params?.nftMint,
    status: params?.status,
  });
  return hostingGet<CollectiblesPagedResult<CollectibleRedemption>>(
    `${HOSTING_API.COLLECTIBLES_REDEMPTIONS}${query}`
  );
}

export async function listCollectibleHubRedemptions(params?: {
  page?: number;
  pageSize?: number;
  nftMint?: string;
  status?: string;
}): Promise<CollectiblesPagedResult<CollectibleRedemption>> {
  const query = buildQuery({
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 20,
    nftMint: params?.nftMint,
    status: params?.status,
  });
  return hostingGet<CollectiblesPagedResult<CollectibleRedemption>>(
    `${HOSTING_API.COLLECTIBLES_HUB_REDEMPTIONS}${query}`
  );
}

export async function listCollectiblePrimarySaleReleaseQueue(params?: {
  tenantID?: string;
  limit?: number;
  retryFailed?: boolean;
}): Promise<CollectiblesPagedResult<CollectiblePrimarySale>> {
  const query = buildQuery({
    tenantID: params?.tenantID,
    limit: params?.limit ?? 25,
    retryFailed: params?.retryFailed === false ? 'false' : 'true',
  });
  return hostingGet<CollectiblesPagedResult<CollectiblePrimarySale>>(
    `${HOSTING_API.COLLECTIBLES_PRIMARY_SALES_RELEASE_QUEUE}${query}`
  );
}

export async function retryCollectiblePrimarySaleReleases(body?: {
  tenantID?: string;
  limit?: number;
}): Promise<CollectiblePrimarySaleReleaseRetryResult> {
  return hostingPost<CollectiblePrimarySaleReleaseRetryResult>(
    HOSTING_API.COLLECTIBLES_PRIMARY_SALES_RELEASE_RETRY,
    body ?? {}
  );
}

export async function shipCollectibleRedemption(
  id: string,
  body: { trackingNo: string }
): Promise<CollectibleRedemption> {
  return hostingPut<CollectibleRedemption>(HOSTING_API.COLLECTIBLES_REDEMPTION_SHIP(id), body);
}

export async function settleCollectibleRedemption(id: string): Promise<CollectibleRedemption> {
  return hostingPut<CollectibleRedemption>(HOSTING_API.COLLECTIBLES_REDEMPTION_SETTLE(id));
}

export async function recoverCollectiblePendingMints(body?: {
  tenantID?: string;
  limit?: number;
  royaltyBps?: number;
}): Promise<CollectiblePendingMintRecoveryReport> {
  return hostingPost<CollectiblePendingMintRecoveryReport>(
    HOSTING_API.COLLECTIBLES_RECONCILE_RECOVER_MINTS,
    body ?? {}
  );
}

export async function listMyCollectibleSourceDeposits(params?: {
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<CollectiblesPagedResult<CollectibleSourceDeposit>> {
  const query = buildQuery({
    status: params?.status,
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 20,
  });
  return hostingGet<CollectiblesPagedResult<CollectibleSourceDeposit>>(
    `${HOSTING_API.COLLECTIBLES_MY_SOURCE_DEPOSITS}${query}`
  );
}

export async function submitMyCollectibleSourceDeposit(body: {
  certNumber: string;
  holderWallet: string;
  grade?: string;
  serial?: string;
  photos?: string[];
  guaranteeAmount?: string;
  guaranteeCurrency?: string;
}): Promise<CollectibleSourceDeposit> {
  return hostingPost<CollectibleSourceDeposit>(HOSTING_API.COLLECTIBLES_MY_SOURCE_DEPOSITS, body);
}

export async function shipMyCollectibleSourceDeposit(
  id: string,
  body: { trackingNo: string }
): Promise<CollectibleSourceDeposit> {
  return hostingPut<CollectibleSourceDeposit>(
    HOSTING_API.COLLECTIBLES_MY_SOURCE_DEPOSIT_SHIP(id),
    body
  );
}

export async function approveCollectibleSourceDeposit(
  id: string
): Promise<CollectibleSourceDeposit> {
  return hostingPut<CollectibleSourceDeposit>(
    HOSTING_API.COLLECTIBLES_SOURCE_DEPOSIT_APPROVE(id),
    {}
  );
}

export async function rejectCollectibleSourceDeposit(
  id: string,
  body: { reason: string }
): Promise<CollectibleSourceDeposit> {
  return hostingPut<CollectibleSourceDeposit>(
    HOSTING_API.COLLECTIBLES_SOURCE_DEPOSIT_REJECT(id),
    body
  );
}

export async function listCollectibleSourceDeposits(params?: {
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<CollectiblesPagedResult<CollectibleSourceDeposit>> {
  const query = buildQuery({
    status: params?.status,
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 20,
  });
  return hostingGet<CollectiblesPagedResult<CollectibleSourceDeposit>>(
    `${HOSTING_API.COLLECTIBLES_SOURCE_DEPOSITS}${query}`
  );
}

export async function createCollectibleSourceDeposit(body: {
  certNumber: string;
  grade?: string;
  serial?: string;
  sellerPeerID: string;
  holderWallet: string;
  guaranteeAmount?: string;
  guaranteeCurrency?: string;
  photos?: string[];
}): Promise<CollectibleSourceDeposit> {
  return hostingPost<CollectibleSourceDeposit>(HOSTING_API.COLLECTIBLES_SOURCE_DEPOSITS, body);
}

export async function mintCollectibleSourceDeposit(
  id: string,
  body?: { holder?: string; royaltyBps?: number }
): Promise<CollectibleNFT> {
  const result = await hostingPost<CollectibleNFT | CollectibleNFTProjection>(
    HOSTING_API.COLLECTIBLES_SOURCE_DEPOSIT_MINT(id),
    body ?? {}
  );
  return normalizeCollectibleNFT(result);
}

export async function recordCollectibleSourceDepositFirstSale(
  id: string,
  body: {
    orderID: string;
    escrowID: string;
    buyerPeerID: string;
    priceAmount: string;
    currencyCode: string;
    divisibility?: number;
  }
): Promise<CollectibleSourceDeposit> {
  return hostingPost<CollectibleSourceDeposit>(
    HOSTING_API.COLLECTIBLES_SOURCE_DEPOSIT_FIRST_SALE(id),
    body
  );
}

export async function shipCollectibleSourceDeposit(
  id: string,
  body: { trackingNo: string }
): Promise<CollectibleSourceDeposit> {
  return hostingPut<CollectibleSourceDeposit>(
    HOSTING_API.COLLECTIBLES_SOURCE_DEPOSIT_SHIP(id),
    body
  );
}

export async function settleCollectibleSourceDeposit(
  id: string
): Promise<CollectibleSourceDeposit> {
  return hostingPut<CollectibleSourceDeposit>(HOSTING_API.COLLECTIBLES_SOURCE_DEPOSIT_SETTLE(id));
}

export async function defaultCollectibleSourceDeposit(
  id: string,
  body: { defaultReason: string }
): Promise<CollectibleSourceDeposit> {
  return hostingPut<CollectibleSourceDeposit>(
    HOSTING_API.COLLECTIBLES_SOURCE_DEPOSIT_DEFAULT(id),
    body
  );
}

export async function getCollectiblePrimarySaleByOrder(
  orderId: string
): Promise<CollectiblePrimarySale | null> {
  const trimmed = orderId.trim();
  if (!trimmed) return null;
  try {
    return await hostingGet<CollectiblePrimarySale>(
      HOSTING_API.COLLECTIBLES_PRIMARY_SALE_BY_ORDER(trimmed)
    );
  } catch (err) {
    if (err instanceof ApiError) {
      // Hosting maps missing bridge rows to forbidden for participant lookup (anti-enumeration).
      if (
        err.status === 404 ||
        err.status === 403 ||
        err.code === 'not_found' ||
        err.code === 'forbidden'
      ) {
        return null;
      }
    }
    throw err;
  }
}

export const collectiblesApi = {
  listHubSlots: listCollectibleHubSlots,
  getHubSlot: getCollectibleHubSlot,
  intakeHubSlot: intakeCollectibleHubSlot,
  rejectHubSlot: rejectCollectibleHubSlot,
  mintHubSlot: mintCollectibleHubSlot,
  listNFTs: listCollectibleNFTs,
  getNFT: getCollectibleNFT,
  bindWallet: bindCollectibleWallet,
  buildBurnTx: buildCollectibleBurnTx,
  createRedemption: createCollectibleRedemption,
  listRedemptions: listCollectibleRedemptions,
  listHubRedemptions: listCollectibleHubRedemptions,
  getRedemption: getCollectibleRedemption,
  shipRedemption: shipCollectibleRedemption,
  settleRedemption: settleCollectibleRedemption,
  recoverPendingMints: recoverCollectiblePendingMints,
  listPrimarySaleReleaseQueue: listCollectiblePrimarySaleReleaseQueue,
  retryPrimarySaleReleases: retryCollectiblePrimarySaleReleases,
  getPrimarySaleByOrder: getCollectiblePrimarySaleByOrder,
  listSourceDeposits: listCollectibleSourceDeposits,
  listMySourceDeposits: listMyCollectibleSourceDeposits,
  submitMySourceDeposit: submitMyCollectibleSourceDeposit,
  shipMySourceDeposit: shipMyCollectibleSourceDeposit,
  approveSourceDeposit: approveCollectibleSourceDeposit,
  rejectSourceDeposit: rejectCollectibleSourceDeposit,
  createSourceDeposit: createCollectibleSourceDeposit,
  mintSourceDeposit: mintCollectibleSourceDeposit,
  recordSourceDepositFirstSale: recordCollectibleSourceDepositFirstSale,
  shipSourceDeposit: shipCollectibleSourceDeposit,
  settleSourceDeposit: settleCollectibleSourceDeposit,
  defaultSourceDeposit: defaultCollectibleSourceDeposit,
};
