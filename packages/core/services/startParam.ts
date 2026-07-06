/**
 * Telegram Mini App `start_param` multi-segment parser.
 *
 * The deep-link protocol is documented in
 * `mobazha_hosting/docs/miniapp/TELEGRAM_DISTRIBUTION_DESIGN.md` §3.1.1.
 *
 * Grammar:
 *   start_param := segment ("__" segment)*
 *   segment     := "store_" <peerID>       # standalone store
 *                | "sf_"    <slug>         # storefront inside a store
 *                | "bind_"  <sessionID>    # account-binding callback
 *                | "s_"     <shortCode>    # short-link redirect
 *                | <routeToken>             # opaque routed-store token
 *
 * Design notes:
 *   - Double underscore `__` is the segment separator. Base58 peer IDs and
 *     kebab-case slugs never contain `_`, so there is no ambiguity with the
 *     intra-segment separator.
 *   - Unrecognized or malformed segments are silently ignored; the parser
 *     never throws. Callers get `undefined` for fields that were absent or
 *     invalid, which keeps the deep-link resilient to future protocol
 *     additions.
 *   - All field-level validation lives here (and mirrors the server-side
 *     regex). Downstream context services can assume trusted input.
 */

import { isValidStorefrontSlug } from './storefrontSlug';

export interface ParsedStartParam {
  /** Standalone store peer ID (base58, ≤80 chars). */
  storePeerID?: string;
  /** Storefront slug (kebab-case, 3..63 chars). */
  storefrontSlug?: string;
  /** Account-binding session ID (alphanumeric, ≤128 chars). */
  bindSessionId?: string;
  /** Short-link redirect code. */
  shortCode?: string;
  /** Opaque 128-bit routed-store token (22-char unpadded Base64URL). */
  storeRouteToken?: string;
}

/**
 * Resolve the Telegram Mini App start parameter from its two official
 * delivery channels. Telegram includes the value in both signed init data
 * (`start_param`) and the page query (`tgWebAppStartParam`). Prefer the signed
 * value once it is available, while keeping the query value as an early-load
 * fallback for SDK initialization races.
 */
export function resolveTelegramStartParam(
  initDataStartParam: string | null | undefined,
  queryStartParam: string | null | undefined
): string | null {
  const fromInitData = initDataStartParam?.trim();
  if (fromInitData) return fromInitData;

  const fromQuery = queryStartParam?.trim();
  return fromQuery || null;
}

const SEGMENT_SEPARATOR = '__';

// Mirrors server-side validation. Slug rules are centralized in
// `./storefrontSlug` so the admin form, slug context, and this parser
// cannot drift. Peer-ID / bind / short-code regexes remain inline — they
// gate different namespaces.
const PEER_ID_PATTERN = /^[A-Za-z0-9]{1,80}$/;
const BIND_SESSION_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const SHORT_CODE_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const STORE_ROUTE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;

/**
 * Parse a `start_param` string into its component segments.
 *
 * Returns an empty object when the input is missing or no segment is valid.
 * The function never throws.
 */
export function parseStartParam(input: string | null | undefined): ParsedStartParam {
  const result: ParsedStartParam = {};
  if (!input) return result;

  const trimmedInput = input.trim();
  // A routed-store token is the entire start_param. Check it before splitting:
  // Base64URL tokens may legitimately contain a double underscore.
  if (STORE_ROUTE_TOKEN_PATTERN.test(trimmedInput)) {
    return { storeRouteToken: trimmedInput };
  }

  const segments = trimmedInput.split(SEGMENT_SEPARATOR);
  for (const raw of segments) {
    const segment = raw.trim();
    if (!segment) continue;

    if (segment.startsWith('store_')) {
      const value = segment.slice('store_'.length);
      if (PEER_ID_PATTERN.test(value) && !result.storePeerID) {
        result.storePeerID = value;
      }
      continue;
    }

    if (segment.startsWith('sf_')) {
      const value = segment.slice('sf_'.length);
      if (isValidStorefrontSlug(value) && !result.storefrontSlug) {
        result.storefrontSlug = value;
      }
      continue;
    }

    if (segment.startsWith('bind_')) {
      const value = segment.slice('bind_'.length);
      if (BIND_SESSION_PATTERN.test(value) && !result.bindSessionId) {
        result.bindSessionId = value;
      }
      continue;
    }

    if (segment.startsWith('s_')) {
      const value = segment.slice('s_'.length);
      if (SHORT_CODE_PATTERN.test(value) && !result.shortCode) {
        result.shortCode = value;
      }
      continue;
    }

    // Unknown prefix: ignore so future protocol extensions are forward-compat.
  }

  return result;
}

/**
 * Build a `start_param` from structured fields. Inverse of `parseStartParam`.
 *
 * Used by tests and (eventually) by the in-app deep-link generator when
 * sellers copy a share link from the admin UI. Invalid fields are silently
 * dropped — the caller is responsible for validating business rules.
 */
export function buildStartParam(parts: ParsedStartParam): string {
  // Routed-store tokens are intentionally exclusive: they select the node
  // before any store-scoped API request can be interpreted.
  if (parts.storeRouteToken && STORE_ROUTE_TOKEN_PATTERN.test(parts.storeRouteToken)) {
    return parts.storeRouteToken;
  }
  const segments: string[] = [];
  if (parts.storePeerID && PEER_ID_PATTERN.test(parts.storePeerID)) {
    segments.push(`store_${parts.storePeerID}`);
  }
  if (parts.storefrontSlug && isValidStorefrontSlug(parts.storefrontSlug)) {
    segments.push(`sf_${parts.storefrontSlug}`);
  }
  if (parts.bindSessionId && BIND_SESSION_PATTERN.test(parts.bindSessionId)) {
    segments.push(`bind_${parts.bindSessionId}`);
  }
  if (parts.shortCode && SHORT_CODE_PATTERN.test(parts.shortCode)) {
    segments.push(`s_${parts.shortCode}`);
  }
  return segments.join(SEGMENT_SEPARATOR);
}
