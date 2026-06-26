/** Hub slot lifecycle — mirrors hosting/db/collectibles.go */
export type CollectibleHubSlotStatus =
  | 'submitted'
  | 'received'
  | 'rejected'
  | 'minting'
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
  hubSlot?: CollectibleHubSlot;
  chain?: string;
  tokenStandard?: string;
  metadataURI?: string;
  royaltyBps?: number;
  mintTxSignature?: string;
  mintConfirmedSlot?: number;
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
  burnAt?: string;
  status: string;
  shipToEncrypted?: string;
  trackingNo?: string;
  slaDueAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type CollectiblePendingMintRecoveryStatus = 'recovered' | 'skipped' | 'failed' | string;

export interface CollectiblePendingMintRecoveryItem {
  hubSlotID: string;
  nftMint?: string;
  txSignature?: string;
  status: CollectiblePendingMintRecoveryStatus;
  message?: string;
}

export interface CollectiblePendingMintRecoveryReport {
  tenantID: string;
  generatedAt: string;
  attempted: number;
  recovered: number;
  skipped: number;
  failed: number;
  items?: CollectiblePendingMintRecoveryItem[];
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

export type CollectiblePrimarySaleReleaseStatus = 'pending' | 'released' | 'failed' | string;

export type CollectiblePrimarySalePhase =
  | 'awaiting_payment'
  | 'awaiting_bridge'
  | 'awaiting_hub'
  | 'payout_pending'
  | 'payout_complete'
  | 'payout_failed';

export interface CollectiblePrimarySale {
  saleID: string;
  tenantID?: string;
  hubSlotID: string;
  nftMint?: string;
  orderID?: string;
  escrowID?: string;
  buyerPeerID?: string;
  sellerPeerID?: string;
  priceAmount?: string;
  currencyCode?: string;
  divisibility?: number;
  paidAt?: string;
  releaseStatus?: CollectiblePrimarySaleReleaseStatus;
  releaseRequestedAt?: string;
  releaseActionID?: string;
  releaseTxHash?: string;
  releaseError?: string;
  releasedAt?: string;
  idempotencyKey?: string;
  hubSlotStatus?: CollectibleHubSlotStatus | string;
  lastMintError?: string;
  createdAt?: string;
  updatedAt?: string;
}
