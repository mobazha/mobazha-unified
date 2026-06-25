import { HOSTING_API } from '../../config/apiPaths';
import { hostingGet, hostingPost } from './helpers';
import type {
  CollectibleBurnTx,
  CollectibleHubSlot,
  CollectibleNFT,
  CollectibleRedemption,
  CollectiblesPagedResult,
} from '../../collectibles/types';

function buildQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    qs.set(key, String(value));
  }
  const serialized = qs.toString();
  return serialized ? `?${serialized}` : '';
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

export async function listCollectibleNFTs(params?: {
  page?: number;
  pageSize?: number;
}): Promise<CollectiblesPagedResult<CollectibleNFT>> {
  const query = buildQuery({
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 20,
  });
  return hostingGet<CollectiblesPagedResult<CollectibleNFT>>(
    `${HOSTING_API.COLLECTIBLES_NFTS}${query}`
  );
}

export async function getCollectibleNFT(mint: string): Promise<CollectibleNFT> {
  return hostingGet<CollectibleNFT>(HOSTING_API.COLLECTIBLES_NFT(mint));
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

export const collectiblesApi = {
  listHubSlots: listCollectibleHubSlots,
  getHubSlot: getCollectibleHubSlot,
  listNFTs: listCollectibleNFTs,
  getNFT: getCollectibleNFT,
  bindWallet: bindCollectibleWallet,
  buildBurnTx: buildCollectibleBurnTx,
  createRedemption: createCollectibleRedemption,
  getRedemption: getCollectibleRedemption,
};
