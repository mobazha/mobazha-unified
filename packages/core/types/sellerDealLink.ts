// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type {
  DealLinkDeliveryType,
  DealLinkPurchaseTemplate,
  DealLinkStatus,
  DealLinkTerms,
} from './dealLink';

export interface SellerDealLinkRequest {
  title: string;
  description?: string;
  deliveryType: DealLinkDeliveryType;
  priceAmount: string;
  priceCurrency: string;
  terms: DealLinkTerms;
  purchaseTemplate: DealLinkPurchaseTemplate;
  expiresAt?: string;
}

/** Seller-owned Deal Link from hosting `/deal-links`. */
export interface SellerDealLink {
  id: string;
  publicToken: string;
  publicPath: string;
  sellerPeerID: string;
  status: DealLinkStatus;
  currentRevision: number;
  title: string;
  description?: string;
  deliveryType: DealLinkDeliveryType;
  priceAmount: string;
  priceCurrency: string;
  terms: DealLinkTerms;
  /** The catalog-bound purchase template; needed to re-submit an edit (PUT). */
  purchaseTemplate?: DealLinkPurchaseTemplate;
  termsHash: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** One order produced by a Deal Link acceptance, for the seller's per-link order list. */
export interface SellerDealLinkOrder {
  orderID: string;
  /**
   * The Deal Link *acceptance* lifecycle status (processing/completed/failed/
   * manual_review) — NOT the order's own lifecycle. 'completed' means the Node
   * order was created, not that it was paid, shipped, or fulfilled.
   */
  acceptanceStatus: string;
  buyerPeerID: string;
  pricingCoin?: string;
  /** Order amount in the pricing coin's minimal units. */
  amount?: string;
  currencyDivisibility?: number;
  createdAt: string;
}

/** A page of Deal Link orders from hosting `/deal-links/{id}/orders`. */
export interface SellerDealLinkOrdersPage {
  items: SellerDealLinkOrder[];
  total: number;
  limit: number;
  offset: number;
}
