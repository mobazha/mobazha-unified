// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/**
 * Store-credential / platform-account denial classification (hosting Phase 1).
 *
 * The hosting backend answers a handful of authenticated store operations with
 * a typed error code. Two very different failure modes are folded in here, and
 * the recovery for each is deliberately distinct:
 *
 * - `STORE_CREDENTIAL_INVALID` — the *store's* own signed Peer credential was
 *   rejected (a 401 against the platform). Recovery re-registers/rotates that
 *   Peer-signed store credential through the local node
 *   (`POST /system/refresh-platform-credential`); nothing here launches OAuth
 *   and no platform *account* is involved. The signed key never leaves the node,
 *   and the affected resource is reloaded only after the re-registration
 *   succeeds — the UI must not claim recovery before the node confirms it.
 * - `ACCOUNT_STORE_MISMATCH` — an *optional* platform-account association points
 *   at a different store. Recovered either by switching to the right account
 *   (OAuth account chooser) or by disconnecting the mismatched account
 *   (`DELETE /system/connect-platform`), which removes only that optional
 *   ownership and preserves the store's Peer identity, data, deal links, orders,
 *   and its own credential authority.
 * - `ACCOUNT_SESSION_REQUIRED` — an *optional* platform-account is not connected
 *   for a feature that needs one. Recovered by connecting an account (OAuth).
 *   Connecting is separate from (and never grants) the store's own key authority.
 *
 * The module maps codes to a stable, UI-facing descriptor of i18n keys and
 * suggested affordances, so every surface renders the same honest guidance
 * instead of a generic "request failed".
 *
 * It is intentionally decoupled from `ApiError`: it duck-types the same
 * `code`/`status` fields `ApiError` exposes directly (see
 * `services/api/client.ts`), so it can classify a real `ApiError` instance or a
 * plain object in a test, and carries no import cycle with the API client.
 */

export type StoreCredentialDenialKind =
  | 'storeCredentialInvalid'
  | 'accountStoreMismatch'
  | 'accountSessionRequired'
  | 'rateLimited';

/**
 * Affordances a surface may offer for a denial, in preferred display order.
 *
 * - `refreshCredential` — re-register/rotate the store's OWN signed Peer
 *   credential via the local node, then reload. This is the ONLY action for
 *   `STORE_CREDENTIAL_INVALID`; it never launches OAuth and touches no platform
 *   account.
 * - `switchAccount` — connect the platform account forcing a fresh account
 *   choice, i.e. switch to a different account (`ACCOUNT_STORE_MISMATCH`).
 * - `disconnect` — disconnect the optional platform account locally, preserving
 *   the store's Peer identity/data/links/history (`ACCOUNT_STORE_MISMATCH`).
 * - `connect` — connect a platform account, possibly reusing an existing
 *   account session (`ACCOUNT_SESSION_REQUIRED`).
 * - `retry` — plain reload/retry of the resource (`RATE_LIMITED`).
 */
export type StoreCredentialDenialAction =
  | 'refreshCredential'
  | 'switchAccount'
  | 'disconnect'
  | 'connect'
  | 'retry';

export interface StoreCredentialDenial {
  kind: StoreCredentialDenialKind;
  /** The backend error code (or a synthesized one) that produced this. */
  code: string;
  /** i18n key for the short headline. */
  titleKey: string;
  /** i18n key for the explanatory body. */
  bodyKey: string;
  /** Suggested affordances; a surface renders only the ones it can wire. */
  actions: StoreCredentialDenialAction[];
}

const CODE_TO_KIND: Record<string, StoreCredentialDenialKind> = {
  STORE_CREDENTIAL_INVALID: 'storeCredentialInvalid',
  ACCOUNT_STORE_MISMATCH: 'accountStoreMismatch',
  ACCOUNT_SESSION_REQUIRED: 'accountSessionRequired',
  RATE_LIMITED: 'rateLimited',
};

const DENIAL_BY_KIND: Record<
  StoreCredentialDenialKind,
  Pick<StoreCredentialDenial, 'kind' | 'titleKey' | 'bodyKey' | 'actions'>
> = {
  storeCredentialInvalid: {
    kind: 'storeCredentialInvalid',
    titleKey: 'storeCredential.storeCredentialInvalidTitle',
    bodyKey: 'storeCredential.storeCredentialInvalidBody',
    // Re-register the store's OWN signed credential via the local node, then
    // reload — never an OAuth flow and no platform account.
    actions: ['refreshCredential'],
  },
  accountStoreMismatch: {
    kind: 'accountStoreMismatch',
    titleKey: 'storeCredential.accountStoreMismatchTitle',
    bodyKey: 'storeCredential.accountStoreMismatchBody',
    // Two honest fixes: switch to the account linked to this store, or drop the
    // mismatched optional account (disconnect) while keeping the store intact.
    actions: ['switchAccount', 'disconnect'],
  },
  accountSessionRequired: {
    kind: 'accountSessionRequired',
    titleKey: 'storeCredential.accountSessionRequiredTitle',
    bodyKey: 'storeCredential.accountSessionRequiredBody',
    actions: ['connect'],
  },
  rateLimited: {
    kind: 'rateLimited',
    titleKey: 'storeCredential.rateLimitedTitle',
    bodyKey: 'storeCredential.rateLimitedBody',
    actions: ['retry'],
  },
};

function readErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' && code.length > 0 ? code : null;
}

function readErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : null;
}

/**
 * Classify a thrown value into a known store-credential denial, or `null` when
 * it is not one of the recognized codes (callers then keep their generic
 * fallback). HTTP 429 is treated as rate limiting even when the body omits a
 * code, since the status is authoritative for that case.
 */
export function classifyStoreCredentialDenial(error: unknown): StoreCredentialDenial | null {
  const code = readErrorCode(error);
  let kind: StoreCredentialDenialKind | null = code ? (CODE_TO_KIND[code] ?? null) : null;
  if (!kind && readErrorStatus(error) === 429) kind = 'rateLimited';
  if (!kind) return null;
  return { ...DENIAL_BY_KIND[kind], code: code ?? 'RATE_LIMITED' };
}

/** True when the error is any recognized store-credential denial. */
export function isStoreCredentialDenial(error: unknown): boolean {
  return classifyStoreCredentialDenial(error) !== null;
}
