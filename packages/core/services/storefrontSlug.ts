/**
 * Storefront slug & ID validation rules.
 *
 * Single source of truth shared by:
 *   - Admin form pre-flight validation (`StorefrontForm.tsx`)
 *   - In-session slug context (`storefrontContext.ts`)
 *   - Deep-link parser (`startParam.ts`)
 *
 * Server authority (must mirror these on every change):
 *   - Slug: `mobazha_hosting/db/storefront_crud.go` → `ValidateStorefrontSlug`
 *     (regex-free procedural check: [a-z0-9-], length 3..63, no leading /
 *     trailing hyphen, no consecutive hyphens, not in reserved list)
 *   - ID:   `mobazha_hosting/db/storefront.go` → `ValidateStorefrontID`
 *     ([A-Za-z0-9_-], length 1..64)
 *
 * The reserved list lives only on the server (it can grow without a client
 * release), so `isValidStorefrontSlug` intentionally returns `true` for a
 * reserved but otherwise well-formed slug. The server is the only authority
 * that can reject it with a precise error.
 */
export const STOREFRONT_SLUG_MIN_LEN = 3;
export const STOREFRONT_SLUG_MAX_LEN = 63;
export const STOREFRONT_ID_MAX_LEN = 64;

/**
 * Canonical storefront slug regex.
 *
 * Shape:
 *   ^[a-z0-9]              first char is alphanumeric
 *   (?:[a-z0-9]|-(?!-))*   interior is alphanumeric or a non-doubled hyphen
 *   [a-z0-9]$              last char is alphanumeric
 *
 * Length is enforced via the length check below rather than a quantifier so
 * the error messages remain intelligible (`too short` vs `bad character`).
 */
const STOREFRONT_SLUG_BODY_RE = /^[a-z0-9](?:[a-z0-9]|-(?!-))*[a-z0-9]$/;

/** Storefront ID regex: `[A-Za-z0-9_-]`, 1..64 chars. */
const STOREFRONT_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/** Returns `true` when the value satisfies the server-authoritative slug contract. */
export function isValidStorefrontSlug(value: string | null | undefined): value is string {
  if (typeof value !== 'string') return false;
  if (value.length < STOREFRONT_SLUG_MIN_LEN) return false;
  if (value.length > STOREFRONT_SLUG_MAX_LEN) return false;
  return STOREFRONT_SLUG_BODY_RE.test(value);
}

/** Returns `true` when the value satisfies the server-authoritative storefront-ID contract. */
export function isValidStorefrontID(value: string | null | undefined): value is string {
  if (typeof value !== 'string') return false;
  return STOREFRONT_ID_RE.test(value);
}
