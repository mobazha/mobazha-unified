// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { DealLinkDeliveryType, DealLinkStatus, DealLinkTerms } from './dealLink';

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
  termsHash: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}
