/**
 * Identity display utilities — centralized functions for rendering
 * user/store names and blockchain addresses in the UI.
 *
 * Rule: Never render raw Peer IDs or blockchain addresses directly.
 * Always use these helpers. See .cursor/rules/identity-display-rules.mdc
 *
 * Browser auto-translate (Chrome / Safari) can mangle stylized names
 * (e.g. "SN6op" → "sn6op"). Use identityNameProps / IdentityName to opt out.
 */

/** Google Translate + HTML5 hint to skip machine translation of proper names. */
export const IDENTITY_NAME_CLASS = 'notranslate';

export interface IdentityNameHtmlProps {
  translate: 'no';
  className?: string;
}

/**
 * HTML props that prevent browser auto-translate from altering a display name.
 * Merge `className` with any existing classes on the element.
 */
export function identityNameProps(className?: string): IdentityNameHtmlProps {
  if (!className) {
    return { translate: 'no', className: IDENTITY_NAME_CLASS };
  }
  const classes = className.split(/\s+/).filter(Boolean);
  if (classes.includes(IDENTITY_NAME_CLASS)) {
    return { translate: 'no', className };
  }
  return { translate: 'no', className: `${IDENTITY_NAME_CLASS} ${className}`.trim() };
}

/** Minimal shape accepted by formatUserName */
export interface IdentityData {
  name?: string;
  handle?: string;
  peerID?: string;
}

export interface FormatUserNameOptions {
  /** Prefix when falling back to truncated peerID (default: none) */
  prefix?: string;
  /** Final fallback when all fields are empty */
  fallback?: string;
  /** Number of leading/trailing chars when truncating peerID (default: 4) */
  truncateChars?: number;
}

/**
 * Extract a human-readable display name from identity data.
 *
 * Priority: name > handle > truncated peerID > fallback
 *
 * @example
 * formatUserName({ name: 'TechStore' })          // "TechStore"
 * formatUserName({ peerID: 'QmY8tRnC...' })      // "QmY8…tRnC"
 * formatUserName(null)                             // ""
 * formatUserName(null, { fallback: 'Seller' })     // "Seller"
 * formatUserName({ peerID: 'QmAbc123' }, { prefix: 'Store' }) // "Store QmAb…c123"
 */
export function formatUserName(
  data?: IdentityData | null,
  options?: FormatUserNameOptions
): string {
  const { prefix, fallback = '', truncateChars = 4 } = options ?? {};

  if (!data) return fallback;

  if (data.name?.trim()) return data.name.trim();
  if (data.handle?.trim()) return data.handle.trim();

  if (data.peerID?.trim()) {
    const truncated = truncatePeerId(data.peerID.trim(), truncateChars);
    return prefix ? `${prefix} ${truncated}` : truncated;
  }

  return fallback;
}

/**
 * Full (non-truncated) Mobazha peer ID — libp2p `12D3Koo…` or IPFS CIDv0 `Qm…`.
 * Shared by chat, moderator lookup, matrix routing, etc.
 */
export const FULL_PEER_ID_PATTERN =
  /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|12D3Koo[1-9A-HJ-NP-Za-km-z]{44,50})$/;

/** Whether input looks like a complete peer ID suitable for direct lookup (not a truncated display ID). */
export function isFullPeerID(input: string | undefined | null): boolean {
  if (!input) return false;
  const trimmed = input.trim();
  return trimmed.length > 0 && FULL_PEER_ID_PATTERN.test(trimmed);
}

/** Known Mobazha peer ID prefixes — libp2p CIDv1 (`12D3KooW…`) or IPFS CIDv0 (`Qm…`). */
export const PEER_ID_PREFIX_LIBP2P = '12D3KooW' as const;
export const PEER_ID_PREFIX_IPFS = 'Qm' as const;

/**
 * Loose prefix check for path segments / composite slugs (not full validation).
 * Use `isFullPeerID` when validating IDs for API lookup or routing.
 */
export function hasPeerIDPrefix(value: string | undefined | null): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed.startsWith(PEER_ID_PREFIX_IPFS) || trimmed.startsWith(PEER_ID_PREFIX_LIBP2P);
}

/**
 * Truncate a Peer ID for display: "QmY8…tRnC"
 * Uses ellipsis character (…) to distinguish from address truncation.
 */
export function truncatePeerId(peerId: string, chars: number = 4): string {
  if (!peerId) return '';
  if (peerId.length <= chars * 2 + 1) return peerId;
  return `${peerId.slice(0, chars)}…${peerId.slice(-chars)}`;
}

/**
 * Truncate a blockchain address for display: "0x1234...cdef"
 * Uses three dots (...) following the conventional address format.
 *
 * @example
 * truncateAddress('0x1234567890abcdef1234567890abcdef12345678')
 * // "0x1234...5678"
 * truncateAddress('0x1234567890abcdef1234567890abcdef12345678', 6, 4)
 * // "0x1234...5678"
 */
export function truncateAddress(
  address: string,
  startChars: number = 6,
  endChars: number = 4
): string {
  if (!address) return '';
  if (address.length <= startChars + endChars + 3) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Build a display name for notifications, omitting "Unknown" prefixes.
 * When no name is available, returns empty string so the notification
 * renders only the event description.
 *
 * @example
 * formatNotificationName({ handle: 'alice' })          // "@alice"
 * formatNotificationName({ peerID: 'QmXyz...' })       // "QmXy…yz.."
 * formatNotificationName({})                            // ""
 * formatNotificationName(null)                          // ""
 */
export function formatNotificationName(data?: IdentityData | null): string {
  if (!data) return '';

  if (data.handle?.trim()) return `@${data.handle.trim()}`;
  if (data.name?.trim()) return data.name.trim();
  if (data.peerID?.trim()) return truncatePeerId(data.peerID.trim(), 4);

  return '';
}

/** Input for {@link resolveProductCardSellerDisplay}. */
export interface ProductCardSellerDisplayInput {
  /** Seller peer ID — used to reject ID-shaped seller labels on product cards. */
  peerID?: string;
  /** Listing or search-index vendor name. */
  name?: string;
  /** Seller handle from listing, search, or profile. */
  handle?: string;
  /** Current profile display name (highest name priority). */
  profileName?: string;
  /** Listing-index or search avatar URL. */
  avatarUrl?: string;
  /** Current profile avatar URL (highest avatar priority). */
  profileAvatarUrl?: string;
}

/** Resolved seller presentation for shared product cards. */
export interface ProductCardSellerDisplay {
  /** Human-readable seller name; empty when no safe label exists (hide seller row). */
  name: string;
  avatarUrl?: string;
}

/** Base58 body segment used in peer ID prefix/suffix around a display ellipsis. */
const PEER_ID_TRUNCATED_BODY = /^[1-9A-HJ-NP-Za-km-z]+$/;

/**
 * Whether a label looks like a truncated peer ID for product-card display
 * (Unicode … or three-dot …), not an ordinary merchant name.
 */
function looksLikeTruncatedPeerIdDisplay(candidate: string): boolean {
  const trimmed = candidate.trim();
  if (!trimmed || isFullPeerID(trimmed)) return false;

  const ellipsisIndex = trimmed.indexOf('…');
  const threeDotIndex = trimmed.indexOf('...');
  let separator: string;
  let sepIndex: number;
  if (ellipsisIndex >= 0) {
    separator = '…';
    sepIndex = ellipsisIndex;
  } else if (threeDotIndex >= 0) {
    separator = '...';
    sepIndex = threeDotIndex;
  } else {
    return false;
  }

  const prefix = trimmed.slice(0, sepIndex);
  const suffix = trimmed.slice(sepIndex + separator.length);
  if (!prefix || !suffix) return false;

  const ipfsPrefixBody = prefix.startsWith(PEER_ID_PREFIX_IPFS) ? prefix.slice(2) : '';
  const libp2pPrefixBody = prefix.startsWith('12D3') ? prefix.slice(4) : '';

  const isIpfsTruncated =
    prefix.startsWith(PEER_ID_PREFIX_IPFS) &&
    prefix.length >= 2 &&
    prefix.length <= 12 &&
    suffix.length >= 2 &&
    suffix.length <= 12 &&
    (ipfsPrefixBody.length === 0 || PEER_ID_TRUNCATED_BODY.test(ipfsPrefixBody)) &&
    PEER_ID_TRUNCATED_BODY.test(suffix);

  const isLibp2pTruncated =
    prefix.startsWith('12D3') &&
    prefix.length >= 4 &&
    prefix.length <= 12 &&
    suffix.length >= 2 &&
    suffix.length <= 12 &&
    (libp2pPrefixBody.length === 0 || PEER_ID_TRUNCATED_BODY.test(libp2pPrefixBody)) &&
    PEER_ID_TRUNCATED_BODY.test(suffix);

  return isIpfsTruncated || isLibp2pTruncated;
}

function isKnownTruncationOfPeerID(candidate: string, peerID: string): boolean {
  const trimmed = candidate.trim();
  const fullPeerID = peerID.trim();
  if (!trimmed || !fullPeerID) return false;

  for (const chars of [4, 6] as const) {
    if (trimmed === truncatePeerId(fullPeerID, chars)) return true;
  }
  return false;
}

function isReadableProductCardSellerName(candidate: string, peerID?: string): boolean {
  const trimmed = candidate.trim();
  if (!trimmed) return false;
  if (peerID?.trim() && trimmed === peerID.trim()) return false;
  if (isFullPeerID(trimmed)) return false;
  if (looksLikeTruncatedPeerIdDisplay(trimmed)) return false;
  if (peerID?.trim() && isKnownTruncationOfPeerID(trimmed, peerID)) return false;
  return true;
}

/**
 * Resolve seller name and avatar for product cards.
 *
 * Product cards must never show a raw or truncated peer ID as the seller name.
 * Adapters pass listing/search fields plus optional freshly fetched profile fields;
 * this helper unifies the post-fetch presentation contract in Core.
 *
 * Name priority: profileName → listing/search name → handle (trimmed).
 * Rejects candidates equal to peerID, matching a full peer ID, or matching a
 * truncated peer ID display (Unicode … or three-dot …).
 * When no readable name remains, returns `{ name: '' }` so UI hides the seller line.
 *
 * Avatar priority: profileAvatarUrl → listing/search avatarUrl.
 */
export function resolveProductCardSellerDisplay(
  input: ProductCardSellerDisplayInput
): ProductCardSellerDisplay {
  const peerID = input.peerID?.trim();

  const nameCandidates = [input.profileName, input.name, input.handle];
  let name = '';
  for (const candidate of nameCandidates) {
    if (!candidate) continue;
    const trimmed = candidate.trim();
    if (isReadableProductCardSellerName(trimmed, peerID)) {
      name = trimmed;
      break;
    }
  }

  const profileAvatar = input.profileAvatarUrl?.trim();
  const listingAvatar = input.avatarUrl?.trim();
  const avatarUrl = profileAvatar || listingAvatar || undefined;

  return { name, avatarUrl };
}
