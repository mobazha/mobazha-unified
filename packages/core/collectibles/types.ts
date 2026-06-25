/** Hub slot lifecycle — mirrors hosting/db/collectibles.go */
export type CollectibleHubSlotStatus =
  | 'submitted'
  | 'received'
  | 'rejected'
  | 'minted'
  | 'in_circulation'
  | 'redeem_requested'
  | 'shipped'
  | 'settled';

export type CollectibleTokenStandard = 'metaplex_pnft' | 'metaplex_cnft';

export interface CollectibleHubSlot {
  hubSlotID: string;
  tenantID?: string;
  issuerPeerID?: string;
  currentHolder?: string;
  grade?: string;
  serial?: string;
  certNumber: string;
  photosJSON?: string;
  hubLocation?: string;
  tokenStandard?: CollectibleTokenStandard | string;
  status: CollectibleHubSlotStatus | string;
  intakeAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CollectibleNFT {
  nftMint: string;
  tenantID?: string;
  hubSlotID: string;
  chain?: string;
  tokenStandard?: string;
  metadataURI?: string;
  royaltyBps?: number;
  mintAt?: string;
  burnAt?: string;
}

export interface CollectibleRedemption {
  redemptionID: string;
  tenantID?: string;
  nftMint: string;
  requesterUserID?: string;
  requesterWallet: string;
  burnTxSignature: string;
  burnSigner?: string;
  status: string;
  trackingNo?: string;
  slaDueAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CollectibleBurnTx {
  nftMint: string;
  holder: string;
  transaction: string;
  message: string;
}

export interface CollectiblesListMeta {
  total: number;
  page: number;
  pageSize: number;
}

export interface CollectiblesPagedResult<T> {
  items: T[];
  meta: CollectiblesListMeta;
}
