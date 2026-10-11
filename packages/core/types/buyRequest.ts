// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { Image } from './common';

/**
 * Buy request ("wanted") domain types.
 *
 * A buy request is the mirror image of a listing: the buyer states what they
 * need, sellers answer with structured offers, and the buyer accepts one offer
 * which is then converted into a normal escrow-backed order.
 *
 * These shapes mirror the node API exactly (pkg/models/buy_request.go and the
 * wire types in internal/api/buy_request_handlers.go). Money travels as
 * `{ amount, currency }` with the amount as a decimal string, so crypto values
 * never round-trip through a float.
 */

/**
 * Lifecycle of a buy request.
 *
 * Four states on purpose: the board only has to know whether a request is still
 * collecting offers, whether the buyer has picked a winner, and how it ended.
 * Expiry is folded into `cancelled`.
 */
export type BuyRequestStatus = 'open' | 'locked' | 'completed' | 'cancelled';

/** Condition the buyer is willing to accept. */
export type BuyRequestCondition = 'any' | 'new' | 'used';

/** Lifecycle of a single seller offer. */
export type BuyRequestOfferStatus = 'submitted' | 'accepted' | 'rejected';

/** A decimal amount plus its currency code, e.g. `{ amount: '450', currency: 'USDT' }`. */
export interface BuyRequestAmount {
  amount: string;
  currency: string;
}

/** Budget window. `max` is required, `min` lets buyers signal a floor. */
export interface BuyRequestBudget {
  max: BuyRequestAmount;
  min?: BuyRequestAmount;
}

/** Minimal identity reference the board returns. `name`/`handle` may be empty. */
export interface BuyRequestParty {
  peerID: string;
  name: string;
  handle: string;
}

/**
 * A buy request as shown in lists and on the detail page.
 *
 * `offerCount` and `expiresAt` are the two numbers the list card shows, so the
 * API returns both without a second round trip.
 */
export interface BuyRequest {
  slug: string;
  /** The record's revision. It starts at 1 and grows with every edit, which is
   * what lets the index refuse a copy the owning node has already replaced. */
  revision?: number;
  buyerID: BuyRequestParty;
  title: string;
  categorySlug: string;
  quantity: number;
  unit?: string;
  budget: BuyRequestBudget;
  /** Currency codes the buyer accepts, e.g. `['USDT', 'USD']`. */
  acceptedCurrencies: string[];
  /** ISO 3166-1 alpha-2 country code the goods must reach. */
  deliverTo: string;
  /** ISO 8601 timestamp; expired requests leave the board automatically. */
  expiresAt: string;
  description?: string;
  condition: BuyRequestCondition;
  /** Pictures attached by the buyer; the node accepts at most 8. */
  images?: Image[];
  status: BuyRequestStatus;
  /** Set once the buyer accepts an offer. */
  acceptedOfferID?: string;
  offerCount: number;
  createdAt: string;
}

/**
 * A seller's structured answer to a buy request.
 *
 * `acceptsEscrow` is a literal `true`: escrow is not optional on Mobazha, and
 * typing it this way makes the rule impossible to bypass by accident.
 */
export interface BuyRequestOffer {
  id: string;
  requestSlug: string;
  sellerID: BuyRequestParty;
  unitPrice: BuyRequestAmount;
  quantity: number;
  leadTimeDays: number;
  /** ISO 3166-1 alpha-2 country code the goods ship from. */
  shipsFrom: string;
  acceptsEscrow: true;
  note?: string;
  status: BuyRequestOfferStatus;
  createdAt: string;
}

/**
 * Payload for creating a buy request.
 *
 * The caller supplies either `expiresInDays` (the "keep this up for N days"
 * form the UI uses) or an exact `expiresAt` timestamp.
 */
export interface CreateBuyRequestRequest {
  title: string;
  /**
   * The listing taxonomy, when the buyer picks one. Optional: a buyer who does
   * not know it is not made to invent one, and the request is still listed.
   */
  productType?: string;
  quantity: number;
  /**
   * The ceiling: an amount in the currency's smallest unit plus the currency it
   * is counted in. This is the shape the signed record carries.
   */
  budget: BuyRequestAmount;
  /** Defaults to the budget currency when omitted. */
  acceptedCurrencies?: string[];
  /**
   * ISO 3166-1 alpha-2 country the goods must reach. Optional, and it is public
   * along with the buyer's identity, which the form says before publishing.
   */
  shipTo?: string;
  description?: string;
  expiresInDays?: number;
  expiresAt?: string;
  /** Hash sets returned by the media upload endpoint. */
  images?: Image[];
}

/**
 * Payload for submitting an offer. A seller may only offer once per request,
 * and the currency must be one the buyer accepts.
 */
export interface CreateBuyRequestOfferRequest {
  unitPrice: BuyRequestAmount;
  quantity: number;
  leadTimeDays: number;
  shipsFrom?: string;
  note?: string;
}

/** Filters accepted by the list endpoint. */
export interface BuyRequestListFilter {
  categorySlug?: string;
  currency?: string;
  deliverTo?: string;
  status?: BuyRequestStatus;
  page?: number;
  pageSize?: number;
}

/** List payload returned by `GET /buy-requests`, already unwrapped from `data`. */
export interface BuyRequestListResponse {
  requests: BuyRequest[];
  total: number;
  page: number;
  pageSize: number;
}

/** Detail payload returned by `GET /buy-requests/{slug}`. */
export interface BuyRequestDetailResponse {
  request: BuyRequest;
  offers: BuyRequestOffer[];
}

/**
 * Draft handed to checkout after a buyer accepts an offer.
 *
 * Kept intentionally close to a listing so the existing checkout/escrow flow can
 * consume it without a parallel payment path.
 */
export interface BuyRequestOrderDraft {
  slug: string;
  vendorID: BuyRequestParty;
  title: string;
  quantity: number;
  unitPrice: BuyRequestAmount;
  /** Total = unitPrice x quantity before shipping. */
  subtotal: BuyRequestAmount;
  currency: string;
  shipsFrom: string;
  deliverTo: string;
  /** Echoed back so the buyer confirms the exact offer they accepted. */
  acceptedOfferID: string;
}

/** Response of `POST /buy-requests/{slug}/accept`. */
export interface AcceptBuyRequestOfferResponse {
  request: BuyRequest;
  orderDraft: BuyRequestOrderDraft;
}

/** Request statuses that are still collecting offers. */
export const BUY_REQUEST_STATUS_OPEN: BuyRequestStatus = 'open';

/** Maximum comment length the node accepts, in characters. */
export const BUY_REQUEST_COMMENT_MAX_LENGTH = 2000;

/**
 * One message in a buy request's thread.
 *
 * Threading is one level deep: a comment either starts a thread (no
 * `parentCommentID`) or answers one that did. `replies` is only populated on
 * top-level comments.
 */
export interface BuyRequestComment {
  id: string;
  requestSlug: string;
  authorID: BuyRequestParty;
  /** Empty for a top-level comment. */
  parentCommentID?: string;
  body: string;
  createdAt: string;
  replies?: BuyRequestComment[];
}

/** Payload returned by `GET /buy-requests/{slug}/comments`. */
export interface BuyRequestCommentThread {
  comments: BuyRequestComment[];
  total: number;
}

/** Payload for posting a comment. Omit `parentCommentID` to start a thread. */
export interface CreateBuyRequestCommentRequest {
  body: string;
  parentCommentID?: string;
}
