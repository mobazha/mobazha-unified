/**
 * My Stores API (Phase MS1 — Multi-Store v2.4)
 *
 * Aggregates every store the authenticated user can manage, across both
 * hosting modes:
 *   - SaaS tenants (user_account → tenants)
 *   - Standalone nodes claimed by the user (store_registry)
 *
 * Backend:
 *   - MS1.1 GET  /platform/v1/stores/my              — list stores (alias: /my-stores)
 *   - MS1.3 POST /platform/v1/stores/claim           — claim an unbound standalone node
 *   - MS1.4 GET  /platform/v1/stores/owner-reputation — public reputation aggregate
 *
 * Source of truth (Go DTO): mobazha_hosting/api/store_registry_handlers.go
 * Keep field names here in sync with the `myStoreItem` struct.
 */

import { hostingGet, hostingPost } from './helpers';
import { HOSTING_API } from '../../config/apiPaths';

// ---------------------------------------------------------------------------
// MS1.1 — My Stores list
// ---------------------------------------------------------------------------

/** Hosting mode the store runs in. */
export type StoreNodeType = 'saas' | 'standalone';

/** Network reachability classification. */
export type StoreConnectivity = 'public' | 'tunnel' | 'nat' | 'unknown';

/** Lifecycle state of the store within the platform. */
export type StoreLifecycleStatus = 'active' | 'suspended' | 'archived';

/**
 * A single store entry in the user's multi-store console.
 *
 * Field names mirror the backend `myStoreItem` struct exactly — do not rename
 * without updating `mobazha_hosting/api/store_registry_handlers.go`.
 */
export interface MyStoreItem {
  peer_id: string;
  store_name?: string;
  node_type: StoreNodeType;
  /** Role within the store — "owner" for Phase MS1; staff roles land in Phase MS3. */
  role: 'owner' | string;
  connectivity: StoreConnectivity;
  status: StoreLifecycleStatus;
  is_online: boolean;
  endpoint_url?: string;
  domain?: string;
  /** ISO-8601 timestamp of the last heartbeat / SaaS activity, if known. */
  last_active_at?: string;
}

/**
 * Fetch all stores the authenticated user can manage.
 *
 * Requires a Casdoor JWT or standalone admin key (resolved by TenantMiddleware).
 * Backend unwraps the envelope to `MyStoreItem[]`.
 */
export async function getMyStores(): Promise<MyStoreItem[]> {
  return hostingGet<MyStoreItem[]>(HOSTING_API.STORES_MY);
}

// ---------------------------------------------------------------------------
// MS1.3 — Claim Store
// ---------------------------------------------------------------------------

/**
 * Request body for POST /platform/v1/stores/claim.
 *
 * Ownership is proven by signing the canonical payload
 *   `mobazha-claim-v1:<peer_id>:<owner_user_id>:<timestamp>:<nonce>`
 * with the store node's libp2p private key (Ed25519-embedded peerIDs only —
 * legacy RSA peerIDs must continue to use the internal API-key claim flow).
 *
 * Backend accepts ±`claimSignatureSkew` timestamp drift; clients should use
 * the current Unix time in seconds and a fresh 16+ byte random nonce.
 *
 * Source of truth: `mobazha_hosting/api/store_registry_handlers.go`
 *   - `storeClaimByUserRequest`
 *   - `verifyClaimSignature`
 */
export interface ClaimStoreRequest {
  /** libp2p peerID of the standalone node being claimed. Required. */
  peer_id: string;
  /** Unix timestamp in seconds. Must be within the server's acceptable skew. */
  timestamp: number;
  /** Fresh random nonce (≤128 chars). Protects against replay. */
  nonce: string;
  /** Base64-encoded libp2p signature over the canonical payload. */
  signature: string;
}

export interface ClaimStoreResponse {
  peer_id: string;
  owner_user_id: string;
  /** True when the caller was already the owner — the endpoint is idempotent. */
  already_own: boolean;
}

/**
 * Claim a standalone store by proving possession of its libp2p private key.
 * Binds the node's `owner_user_id` to the authenticated Casdoor user.
 *
 * The signature must be produced by the node itself (typically via its admin
 * API); the frontend merely forwards the already-signed payload.
 */
export async function claimStore(req: ClaimStoreRequest): Promise<ClaimStoreResponse> {
  return hostingPost<ClaimStoreResponse>(HOSTING_API.STORES_CLAIM, req);
}

// ---------------------------------------------------------------------------
// MS1.4 — Owner Reputation Aggregate
// ---------------------------------------------------------------------------

/** A summarized store entry exposed by the public owner-reputation endpoint. */
export interface OwnerReputationStore {
  peer_id: string;
  store_name?: string;
  node_type: StoreNodeType;
  connectivity?: StoreConnectivity;
  domain?: string;
  endpoint_url?: string;
  status: StoreLifecycleStatus;
  is_online: boolean;
  /** True when this entry matches the queried peer_id (marker for the "self" row). */
  is_self: boolean;
  /** ISO-8601 creation timestamp — useful for store-age badges. */
  created_at?: string;
  last_active_at?: string;
}

/**
 * Response of GET /platform/v1/stores/owner-reputation?peer_id=...
 *
 * If the queried peer is unclaimed, `owner_public_id` is empty and
 * `store_count === 0`. Callers should render a neutral state in that case.
 *
 * Rating aggregation (Phase MS5) is intentionally deferred — this payload
 * currently exposes only structural reputation (how many stores an owner runs
 * and their liveness), never raw `owner_user_id`.
 */
export interface OwnerReputationResponse {
  /** Echo of the queried peer_id. */
  peer_id: string;
  /** Pseudonymous hash prefix of the `owner_user_id` (empty when unclaimed). */
  owner_public_id: string;
  store_count: number;
  stores: OwnerReputationStore[];
}

export async function getOwnerReputation(peerID: string): Promise<OwnerReputationResponse> {
  if (!peerID) {
    throw new Error('peerID is required');
  }
  const qs = new URLSearchParams({ peer_id: peerID }).toString();
  return hostingGet<OwnerReputationResponse>(`${HOSTING_API.STORES_OWNER_REPUTATION}?${qs}`);
}
