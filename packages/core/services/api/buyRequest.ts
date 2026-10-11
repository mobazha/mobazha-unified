// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/**
 * Buy request (wanted board) API service.
 *
 * Two endpoint families:
 *   - Public: browse open requests and read a request with its offers
 *   - Authenticated: publish a request, submit an offer, accept an offer
 *
 * Accepting an offer returns an order draft that the existing checkout flow
 * turns into an escrow-backed order, so no payment path is duplicated here.
 *
 * The board lives on the local node, so the authenticated calls use the
 * `nodeAuth*` helpers rather than `auth*`: the latter route a standalone buyer
 * to the SaaS gateway, which does not serve this node-local endpoint.
 *
 * A request belongs to the node its buyer published it on. `peer` names that
 * node, so a caller anywhere else can still read the request, offer on it or
 * post to its thread: the local node relays the call over the p2p channel and
 * hands back the owning node's answer. Leaving `peer` out means "this node",
 * which is what every link inside a request's own node carries.
 */

import { NODE_API, SEARCH_API } from '../../config/apiPaths';
import {
  nodeAuthDel,
  nodeAuthGet,
  nodeAuthPost,
  nodeAuthPut,
  publicGet,
  searchRawGet,
} from './helpers';
import type {
  AcceptBuyRequestOfferResponse,
  BuyRequest,
  BuyRequestComment,
  BuyRequestCommentThread,
  BuyRequestDetailResponse,
  BuyRequestListFilter,
  BuyRequestListResponse,
  BuyRequestOffer,
  CreateBuyRequestCommentRequest,
  CreateBuyRequestOfferRequest,
  CreateBuyRequestRequest,
} from '../../types/buyRequest';

export type {
  AcceptBuyRequestOfferResponse,
  BuyRequest,
  BuyRequestComment,
  BuyRequestCommentThread,
  BuyRequestDetailResponse,
  BuyRequestListFilter,
  BuyRequestListResponse,
  BuyRequestOffer,
  CreateBuyRequestCommentRequest,
  CreateBuyRequestOfferRequest,
  CreateBuyRequestRequest,
} from '../../types/buyRequest';

function buildListQuery(filter?: BuyRequestListFilter): string {
  if (!filter) return '';
  const params = new URLSearchParams();
  if (filter.categorySlug) params.set('categorySlug', filter.categorySlug);
  if (filter.currency) params.set('currency', filter.currency);
  if (filter.deliverTo) params.set('deliverTo', filter.deliverTo);
  if (filter.status) params.set('status', filter.status);
  if (filter.page) params.set('page', String(filter.page));
  if (filter.pageSize) params.set('pageSize', String(filter.pageSize));
  const query = params.toString();
  return query ? `?${query}` : '';
}

/**
 * Names the node that owns a request, when it is not this one.
 *
 * The server answers a request it owns itself and relays anything else to the
 * named peer, which decides what the caller may do. The peer ID is therefore
 * passed through as given: the server validates it and reports a peer it cannot
 * reach.
 */
function withOwnerPeer(path: string, peer?: string | null): string {
  const owner = (peer ?? '').trim();
  if (!owner) return path;
  return `${path}?peer=${encodeURIComponent(owner)}`;
}

// ========== Public ==========

/**
 * One request as the search index holds it: the record the owning node
 * published, exactly as that node signed it. The index adds nothing of its own,
 * so a reader parses the same shape the node produced.
 */
interface IndexedBuyRequestRecord {
  requestID: string;
  revision: number;
  peerID: string;
  title: string;
  quantity: number;
  budget?: { currency?: { code?: string; divisibility?: number }; amount?: string };
  acceptedCurrencies?: string[];
  shipTo?: string;
  productType?: string;
  description?: string;
  images?: BuyRequest['images'];
  status: string;
  createdAt: string;
  expiresAt: string;
  /**
   * The buyer's public profile, when the owning node publishes it. Only the
   * display values are here: the peer ID beside them is what a client addresses.
   */
  buyer?: { name?: string; handle?: string };
}

/** One page of the index's answer. Each hit is wrapped the same way a listing
 * hit is, so a client reads anything the index returns the same way. */
interface IndexedBuyRequestPage {
  data?: { data?: IndexedBuyRequestRecord; type?: string }[];
  meta?: { total?: number; hasMore?: boolean };
}

/**
 * Which node owns each request the board has read.
 *
 * The index addresses a request as {peerID}/{requestID} — an identifier alone
 * does not name one — so a link that carries only the identifier still resolves
 * once this client has read the board.
 */
const requestOwners = new Map<string, string>();

function rememberOwner(requestID: string, peerID: string): void {
  if (requestID && peerID) requestOwners.set(requestID, peerID);
}

/**
 * The index's own query vocabulary: it pages with `p`, and it filters by the
 * record's field names rather than by the node's.
 */
function buildIndexQuery(filter?: BuyRequestListFilter): string {
  if (!filter) return '';
  const params = new URLSearchParams();
  if (filter.categorySlug) params.set('productType', filter.categorySlug);
  if (filter.currency) params.set('currency', filter.currency);
  if (filter.deliverTo) params.set('shipTo', filter.deliverTo);
  if (filter.page) params.set('p', String(filter.page));
  if (filter.pageSize) params.set('pageSize', String(filter.pageSize));
  const query = params.toString();
  return query ? `?${query}` : '';
}

/**
 * The board itself: what buyers are looking for across every node that has
 * published to the search index.
 *
 * A request is owned by one node and that node is its only writer, so the
 * index is told what to list rather than asked to crawl. With no index to
 * read — a standalone store, or one that was never given a search service —
 * the local board is the whole board, which is what this falls back to.
 */
export async function listBoardBuyRequests(
  filter?: BuyRequestListFilter
): Promise<BuyRequestListResponse> {
  // The index answers with the same envelope as every other search call —
  // data plus meta — so it is read raw and unwrapped here.
  const page = await searchRawGet<IndexedBuyRequestPage | null>(
    `${SEARCH_API.SEARCH_BUY_REQUESTS}${buildIndexQuery(filter)}`,
    null
  );
  if (!page) {
    // No usable index: the local board is all this node knows about.
    return listBuyRequests(filter);
  }
  const hits = page.data ?? [];
  return {
    requests: hits
      .map(hit => hit?.data)
      .filter((record): record is IndexedBuyRequestRecord => !!record?.requestID)
      .map(indexedRecordToBuyRequest),
    total: page.meta?.total ?? hits.length,
    page: filter?.page ?? 1,
    pageSize: filter?.pageSize ?? hits.length,
  };
}

/** Turns one record back into the shape a board renders. The record is the
 * owning node's own copy, so every field a card shows is already in it. */
function indexedRecordToBuyRequest(record: IndexedBuyRequestRecord): BuyRequest {
  rememberOwner(record.requestID, record.peerID);
  return {
    slug: record.requestID,
    revision: record.revision,
    buyerID: {
      peerID: record.peerID,
      name: record.buyer?.name ?? '',
      handle: record.buyer?.handle ?? '',
    },
    title: record.title,
    categorySlug: record.productType ?? '',
    description: record.description ?? '',
    quantity: record.quantity ?? 1,
    budget: {
      max: {
        amount: record.budget?.amount ?? '0',
        currency: record.budget?.currency?.code ?? '',
      },
    },
    acceptedCurrencies: record.acceptedCurrencies ?? [],
    deliverTo: record.shipTo ?? '',
    // The record carries a budget and a country, but no condition: the board
    // stopped asking for one.
    condition: 'any',
    status: record.status as BuyRequest['status'],
    // The index holds no offer count, so this board does not claim one. The
    // owning node answers that question, and the detail page asks it there.
    offerCount: 0,
    expiresAt: record.expiresAt,
    createdAt: record.createdAt,
    images: record.images,
  };
}

/** Which node owns a request, according to the board this client has read.
 * Empty when it has never seen the request, which leaves the caller to report
 * the original failure. */
function findBuyRequestOwner(requestID: string): string {
  return requestOwners.get(requestID) ?? '';
}

export async function listBuyRequests(
  filter?: BuyRequestListFilter
): Promise<BuyRequestListResponse> {
  return publicGet<BuyRequestListResponse>(`${NODE_API.BUY_REQUESTS}${buildListQuery(filter)}`);
}

export async function getBuyRequest(
  slug: string,
  peer?: string | null
): Promise<BuyRequestDetailResponse> {
  if (peer) {
    return publicGet<BuyRequestDetailResponse>(withOwnerPeer(NODE_API.BUY_REQUEST(slug), peer));
  }
  try {
    return await publicGet<BuyRequestDetailResponse>(NODE_API.BUY_REQUEST(slug));
  } catch (error) {
    // Not this node's request. The index knows which node owns the slug, and
    // that node is still the one that answers: the index lists requests, it
    // does not hold the offers or the thread.
    const owner = findBuyRequestOwner(slug);
    if (!owner) throw error;
    return publicGet<BuyRequestDetailResponse>(withOwnerPeer(NODE_API.BUY_REQUEST(slug), owner));
  }
}

// ========== Authenticated ==========

export async function listMyBuyRequests(): Promise<BuyRequestListResponse> {
  return nodeAuthGet<BuyRequestListResponse>(NODE_API.BUY_REQUESTS_MINE);
}

export async function createBuyRequest(data: CreateBuyRequestRequest): Promise<BuyRequest> {
  return nodeAuthPost<BuyRequest>(NODE_API.BUY_REQUESTS, data);
}

export async function cancelBuyRequest(slug: string): Promise<BuyRequest> {
  return nodeAuthDel<BuyRequest>(NODE_API.BUY_REQUEST(slug));
}

/**
 * Edits a request the buyer published.
 *
 * The node keeps the identifier and moves the record's revision forward, which
 * is what tells an index that already holds a copy that this one replaces it.
 */
export async function updateBuyRequest(
  slug: string,
  data: CreateBuyRequestRequest
): Promise<BuyRequest> {
  return nodeAuthPut<BuyRequest>(NODE_API.BUY_REQUEST(slug), data);
}

export async function createBuyRequestOffer(
  slug: string,
  data: CreateBuyRequestOfferRequest,
  peer?: string | null
): Promise<BuyRequestOffer> {
  return nodeAuthPost<BuyRequestOffer>(
    withOwnerPeer(NODE_API.BUY_REQUEST_OFFERS(slug), peer),
    data
  );
}

export async function acceptBuyRequestOffer(
  slug: string,
  offerID: string
): Promise<AcceptBuyRequestOfferResponse> {
  return nodeAuthPost<AcceptBuyRequestOfferResponse>(NODE_API.BUY_REQUEST_ACCEPT(slug), {
    offerID,
  });
}

// ========== Comments ==========

export async function listBuyRequestComments(
  slug: string,
  peer?: string | null
): Promise<BuyRequestCommentThread> {
  return publicGet<BuyRequestCommentThread>(
    withOwnerPeer(NODE_API.BUY_REQUEST_COMMENTS(slug), peer)
  );
}

export async function createBuyRequestComment(
  slug: string,
  data: CreateBuyRequestCommentRequest,
  peer?: string | null
): Promise<BuyRequestComment> {
  return nodeAuthPost<BuyRequestComment>(
    withOwnerPeer(NODE_API.BUY_REQUEST_COMMENTS(slug), peer),
    data
  );
}
