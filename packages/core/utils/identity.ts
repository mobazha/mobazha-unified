/**
 * Identity display utilities — centralized functions for rendering
 * user/store names and blockchain addresses in the UI.
 *
 * Rule: Never render raw Peer IDs or blockchain addresses directly.
 * Always use these helpers. See .cursor/rules/identity-display-rules.mdc
 */

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
