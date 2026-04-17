/**
 * Storefronts Lite API — Phase MS-Phase-2a
 *
 * Per-store storefront CRUD. Each store_registry entry holds a JSONB array of
 * lightweight "storefronts" (named filters + theme + access rules) that share
 * the same underlying node. The implicit "default" storefront always exists
 * and can be configured in-place; owner-created storefronts get an explicit ID.
 *
 * Source of truth (Go):
 *   - mobazha_hosting/api/storefront_handlers.go   — HTTP handlers
 *   - mobazha_hosting/db/storefront.go             — Storefront / child structs
 *
 * All management endpoints are owner-only (JWT + store_registry.owner_user_id
 * match). The public by-slug lookup is anonymous and never leaks private
 * storefronts.
 */

import { hostingGet, hostingPost, hostingPatch, hostingDel } from './helpers';
import { HOSTING_API } from '../../config/apiPaths';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Reserved ID for the implicit "main" storefront on every store. */
export const DEFAULT_STOREFRONT_ID = 'default';

/** Visibility tier — mirrors repo/visibility enum on the backend. */
export type StorefrontVisibility = 'public' | 'unlisted' | 'private';

// ---------------------------------------------------------------------------
// Wire types (MUST stay in sync with mobazha_hosting/db/storefront.go)
// ---------------------------------------------------------------------------

export interface StorefrontFilter {
  collection_ids?: string[];
  tags?: string[];
  exclude_tags?: string[];
}

export type StorefrontPriceRuleType = 'flat_discount' | 'flat_markup' | 'fixed_surcharge';

export interface StorefrontPriceRule {
  type: StorefrontPriceRuleType;
  /** Percentage points for flat_discount / flat_markup (e.g. 15 = 15%). */
  value_pct?: number;
  /** Minor units for fixed_surcharge (e.g. 100 = $1.00 at divisibility 2). */
  amount_minor?: number;
}

export type StorefrontAccessRuleType = 'public' | 'access_list';

export interface StorefrontAccessRule {
  type: StorefrontAccessRuleType;
  required_tags?: string[];
}

export interface StorefrontTelegram {
  startapp_token?: string;
  bot_binding?: string;
  channel_id?: string;
  topic_id?: string;
}

export interface StorefrontTheme {
  /** Named theme preset (e.g. "minimal", "grid-v2"). */
  base?: string;
  /** Design tokens — server-side allow-list restricts keys + values. */
  tokens?: Record<string, string>;
  layout?: Record<string, string>;
  assets?: Record<string, string>;
}

/**
 * A storefront entry as returned by the owner-only CRUD endpoints.
 *
 * `is_default` marks the implicit default (always present, archive-protected).
 * `archived_at` is set when the storefront was soft-deleted — archived
 * storefronts are returned by list but hidden from public slug lookups.
 */
export interface Storefront {
  id: string;
  name: string;
  slug?: string;
  visibility: StorefrontVisibility;
  is_default?: boolean;
  created_at: string;
  archived_at?: string;
  filter?: StorefrontFilter;
  price_rule?: StorefrontPriceRule;
  access_rule?: StorefrontAccessRule;
  telegram?: StorefrontTelegram;
  theme?: StorefrontTheme;
}

export interface StorefrontCreateRequest {
  /** Client-chosen ID. Cannot be the reserved "default". Required. */
  id: string;
  name: string;
  slug?: string;
  visibility: StorefrontVisibility;
  filter?: StorefrontFilter;
  price_rule?: StorefrontPriceRule;
  access_rule?: StorefrontAccessRule;
  telegram?: StorefrontTelegram;
  theme?: StorefrontTheme;
}

/**
 * Partial update payload. Fields left `undefined` are preserved; setting the
 * paired `*_clear` flag explicitly removes the nested object (backend has no
 * sentinel for "omit vs clear", so we surface the distinction at the wire).
 */
export interface StorefrontUpdateRequest {
  name?: string;
  slug?: string;
  visibility?: StorefrontVisibility;
  filter?: StorefrontFilter;
  price_rule?: StorefrontPriceRule;
  access_rule?: StorefrontAccessRule;
  telegram?: StorefrontTelegram;
  theme?: StorefrontTheme;
  filter_clear?: boolean;
  price_rule_clear?: boolean;
  access_rule_clear?: boolean;
  telegram_clear?: boolean;
  theme_clear?: boolean;
}

/**
 * Public, anonymous-safe resolver payload. Mirrors the backend
 * `publicStorefrontResponse` — no access_rule, no archived flag.
 */
export interface PublicStorefrontBySlug {
  peer_id: string;
  id: string;
  name: string;
  slug?: string;
  visibility: StorefrontVisibility;
  theme?: StorefrontTheme;
  telegram?: StorefrontTelegram;
  filter?: StorefrontFilter;
  price_rule?: StorefrontPriceRule;
}

// ---------------------------------------------------------------------------
// Owner-only CRUD
// ---------------------------------------------------------------------------

/**
 * List all storefronts (including archived) for a store. The implicit
 * "default" storefront is always the first element.
 */
export async function listStorefronts(peerID: string): Promise<Storefront[]> {
  if (!peerID) throw new Error('peerID is required');
  return hostingGet<Storefront[]>(HOSTING_API.STORES_STOREFRONTS(peerID));
}

/**
 * Fetch a single storefront. Pass `"default"` (or `DEFAULT_STOREFRONT_ID`) to
 * resolve the implicit default — the backend accepts both.
 */
export async function getStorefront(peerID: string, sfID: string): Promise<Storefront> {
  if (!peerID) throw new Error('peerID is required');
  const id = sfID || DEFAULT_STOREFRONT_ID;
  return hostingGet<Storefront>(HOSTING_API.STORES_STOREFRONT(peerID, id));
}

/** Create a new storefront. IDs must be owner-chosen and not "default". */
export async function createStorefront(
  peerID: string,
  payload: StorefrontCreateRequest
): Promise<Storefront> {
  if (!peerID) throw new Error('peerID is required');
  if (!payload.id) throw new Error('storefront id is required');
  if (payload.id === DEFAULT_STOREFRONT_ID) {
    throw new Error('storefront id "default" is reserved');
  }
  return hostingPost<Storefront>(HOSTING_API.STORES_STOREFRONTS(peerID), payload);
}

/**
 * Patch a storefront. Empty `sfID` targets the default storefront, matching
 * the backend semantics so callers can reuse the same function.
 */
export async function updateStorefront(
  peerID: string,
  sfID: string,
  patch: StorefrontUpdateRequest
): Promise<Storefront> {
  if (!peerID) throw new Error('peerID is required');
  const id = sfID || DEFAULT_STOREFRONT_ID;
  return hostingPatch<Storefront>(HOSTING_API.STORES_STOREFRONT(peerID, id), patch);
}

/**
 * Archive (soft-delete) a storefront. The default storefront is
 * archive-protected — the backend returns 403 and this helper surfaces the
 * `ApiError` unchanged so UI can display the canonical message.
 */
export async function archiveStorefront(peerID: string, sfID: string): Promise<void> {
  if (!peerID) throw new Error('peerID is required');
  if (!sfID) throw new Error('sfID is required');
  if (sfID === DEFAULT_STOREFRONT_ID) {
    throw new Error('default storefront cannot be archived');
  }
  await hostingDel<void>(HOSTING_API.STORES_STOREFRONT(peerID, sfID));
}

// ---------------------------------------------------------------------------
// Public resolver
// ---------------------------------------------------------------------------

/**
 * Resolve a public slug to (peerID, storefront). Private storefronts are not
 * discoverable via slug — they must be reached through an owner-dispatched
 * URL carrying their ID directly.
 */
export async function lookupStorefrontBySlug(slug: string): Promise<PublicStorefrontBySlug> {
  const normalized = (slug || '').trim().toLowerCase();
  if (!normalized) throw new Error('slug is required');
  return hostingGet<PublicStorefrontBySlug>(HOSTING_API.STOREFRONTS_BY_SLUG(normalized));
}
