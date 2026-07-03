// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/** OpenBazaar listing tag length limit. */
export const COLLECTIBLE_LISTING_TAG_MAX_LEN = 40;

/** OpenBazaar listing tag count limit. */
export const COLLECTIBLE_LISTING_TAG_MAX_COUNT = 10;

export const COLLECTIBLE_LISTING_TAG_PREFIX = 'collectibles.';

export const COLLECTIBLE_LISTING_COMPACT_CHUNK_PREFIX = 'c.';

/** Stable short aliases for compact chunk encoding (`c.<alias>@i/n=payload`). */
export const COLLECTIBLE_LISTING_KEY_ALIASES: Readonly<Record<string, string>> = {
  hub_slot_id: 'hs',
  cert_number: 'cn',
};

const COLLECTIBLE_LISTING_TAG_PREFIXES = [
  'collectibles:',
  'collectibles.',
  COLLECTIBLE_LISTING_COMPACT_CHUNK_PREFIX,
] as const;

const ALIAS_TO_KEY: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(COLLECTIBLE_LISTING_KEY_ALIASES).map(([key, alias]) => [alias, key])
);

export function collectibleListingCanonicalTag(key: string, value: string): string {
  return `${COLLECTIBLE_LISTING_TAG_PREFIX}${key}=${value}`;
}

function resolveChunkAlias(key: string): string {
  return COLLECTIBLE_LISTING_KEY_ALIASES[key] ?? key;
}

function resolveChunkBaseKey(rawBase: string): string {
  const trimmed = rawBase.trim();
  return ALIAS_TO_KEY[trimmed] ?? trimmed;
}

function legacyChunkCollectibleListingTagHeader(key: string, index: number, total: number): string {
  return `${COLLECTIBLE_LISTING_TAG_PREFIX}${key}@${index}/${total}=`;
}

function compactChunkCollectibleListingTagHeader(
  alias: string,
  index: number,
  total: number
): string {
  return `${COLLECTIBLE_LISTING_COMPACT_CHUNK_PREFIX}${alias}@${index}/${total}=`;
}

function maxLegacyChunkPayloadSize(key: string, index: number, total: number): number {
  return (
    COLLECTIBLE_LISTING_TAG_MAX_LEN -
    legacyChunkCollectibleListingTagHeader(key, index, total).length
  );
}

function maxCompactChunkPayloadSize(alias: string, index: number, total: number): number {
  return (
    COLLECTIBLE_LISTING_TAG_MAX_LEN -
    compactChunkCollectibleListingTagHeader(alias, index, total).length
  );
}

function parseChunkCollectibleKey(
  key: string
): { baseKey: string; index: number; total: number } | null {
  const at = key.lastIndexOf('@');
  if (at <= 0) return null;

  const rawBase = key.slice(0, at).trim();
  const baseKey = resolveChunkBaseKey(rawBase);
  const suffix = key.slice(at + 1);
  const slash = suffix.indexOf('/');
  if (slash <= 0) return null;

  const indexText = suffix.slice(0, slash);
  const totalText = suffix.slice(slash + 1);
  if (!/^\d+$/.test(indexText) || !/^\d+$/.test(totalText)) return null;

  const index = Number.parseInt(indexText, 10);
  const total = Number.parseInt(totalText, 10);
  if (
    !Number.isFinite(index) ||
    !Number.isFinite(total) ||
    total < 1 ||
    index < 0 ||
    index >= total
  ) {
    return null;
  }

  return { baseKey, index, total };
}

function buildDeterministicChunkTags(
  headerFor: (index: number, total: number) => string,
  maxPayloadFor: (index: number, total: number) => number,
  trimmedValue: string,
  errorKey: string
): string[] {
  let total = Math.max(1, Math.ceil(trimmedValue.length / 24));

  for (let attempt = 0; attempt < 32; attempt += 1) {
    const chunks: string[] = [];
    let offset = 0;

    while (offset < trimmedValue.length && chunks.length < total) {
      const payloadSize = maxPayloadFor(chunks.length, total);
      if (payloadSize < 1) break;

      const chunk = trimmedValue.slice(offset, offset + payloadSize);
      if (!chunk) break;

      chunks.push(chunk);
      offset += chunk.length;
    }

    if (offset !== trimmedValue.length) {
      total += 1;
      continue;
    }

    if (chunks.length !== total) {
      total = chunks.length;
      continue;
    }

    const tags = chunks.map((chunk, index) => `${headerFor(index, total)}${chunk}`);
    if (tags.every(tag => tag.length <= COLLECTIBLE_LISTING_TAG_MAX_LEN)) {
      return tags;
    }

    total += 1;
  }

  throw new Error(`Unable to chunk collectible listing tag for key "${errorKey}"`);
}

/**
 * Build one canonical tag or deterministic compact chunk tags (all <= 40 chars).
 * Short values: `collectibles.<key>=<value>`.
 * Long values: `c.<stable-key-alias>@<index>/<total>=<payload>`.
 */
export function buildCollectibleListingTagEntries(
  key: string,
  value: string | undefined
): string[] {
  const trimmedKey = key.trim();
  const trimmedValue = (value ?? '').trim();
  if (!trimmedKey || !trimmedValue) return [];

  const canonical = collectibleListingCanonicalTag(trimmedKey, trimmedValue);
  if (canonical.length <= COLLECTIBLE_LISTING_TAG_MAX_LEN) {
    return [canonical];
  }

  const alias = resolveChunkAlias(trimmedKey);
  return buildDeterministicChunkTags(
    (index, total) => compactChunkCollectibleListingTagHeader(alias, index, total),
    (index, total) => maxCompactChunkPayloadSize(alias, index, total),
    trimmedValue,
    trimmedKey
  );
}

/** Backward-compatible single-tag builder — returns canonical tag or first chunk. */
export function buildCollectibleListingTag(key: string, value: string | undefined): string {
  return buildCollectibleListingTagEntries(key, value)[0] ?? '';
}

export function parseCollectibleListingTag(tag: string): { key: string; value: string } | null {
  const trimmed = tag.trim();
  const prefix = COLLECTIBLE_LISTING_TAG_PREFIXES.find(entry => trimmed.startsWith(entry));
  if (!prefix) return null;

  const body = trimmed.slice(prefix.length);
  const eq = body.indexOf('=');
  if (eq <= 0) return null;

  const rawKey = body.slice(0, eq).trim();
  const value = body.slice(eq + 1).trim();
  const chunkMeta = parseChunkCollectibleKey(rawKey);
  const key = chunkMeta?.baseKey ?? rawKey;

  return { key, value };
}

/** Parse listing tags into key/value pairs, reassembling chunked values when complete. */
export function parseCollectibleListingTagMap(tags: readonly string[]): Record<string, string> {
  const direct: Record<string, string> = {};
  const chunkGroups = new Map<string, Map<number, { total: number; value: string }>>();

  for (const tag of tags) {
    const parsed = parseCollectibleListingTag(tag);
    if (!parsed?.key || !parsed.value) continue;

    const trimmed = tag.trim();
    const prefix = COLLECTIBLE_LISTING_TAG_PREFIXES.find(entry => trimmed.startsWith(entry));
    const body = prefix ? trimmed.slice(prefix.length) : trimmed;
    const eq = body.indexOf('=');
    const rawKey = eq > 0 ? body.slice(0, eq).trim() : parsed.key;

    const chunkMeta = parseChunkCollectibleKey(rawKey);
    if (chunkMeta) {
      const group = chunkGroups.get(chunkMeta.baseKey) ?? new Map();
      group.set(chunkMeta.index, { total: chunkMeta.total, value: parsed.value });
      chunkGroups.set(chunkMeta.baseKey, group);
      continue;
    }

    direct[parsed.key] = parsed.value;
  }

  const merged = { ...direct };

  for (const [baseKey, parts] of chunkGroups) {
    if (merged[baseKey]) continue;

    const totals = new Set(Array.from(parts.values(), entry => entry.total));
    if (totals.size !== 1) continue;

    const total = Array.from(totals)[0]!;
    if (parts.size !== total) continue;

    let reassembled = '';
    let complete = true;
    for (let index = 0; index < total; index += 1) {
      const part = parts.get(index);
      if (!part || part.total !== total) {
        complete = false;
        break;
      }
      reassembled += part.value;
    }

    if (complete && reassembled) {
      merged[baseKey] = reassembled;
    }
  }

  return merged;
}

/**
 * Whether a listing tag is reserved collectible implementation metadata.
 * These must not appear in generic public tag UI (product detail, marketplace chips, etc.).
 */
export function isCollectibleListingReservedTag(tag: string): boolean {
  return parseCollectibleListingTag(tag) !== null;
}

/** Buyer-facing discovery tags only — strips collectibles.* / c.* chunk metadata. */
export function filterPublicProductDisplayTags(tags: readonly string[]): string[] {
  return tags.filter(tag => !isCollectibleListingReservedTag(tag));
}

/** @internal Legacy long chunk builder kept for parser compatibility tests. */
export function buildLegacyLongCollectibleListingTagEntries(key: string, value: string): string[] {
  const trimmedKey = key.trim();
  const trimmedValue = value.trim();
  if (!trimmedKey || !trimmedValue) return [];

  const canonical = collectibleListingCanonicalTag(trimmedKey, trimmedValue);
  if (canonical.length <= COLLECTIBLE_LISTING_TAG_MAX_LEN) {
    return [canonical];
  }

  return buildDeterministicChunkTags(
    (index, total) => legacyChunkCollectibleListingTagHeader(trimmedKey, index, total),
    (index, total) => maxLegacyChunkPayloadSize(trimmedKey, index, total),
    trimmedValue,
    trimmedKey
  );
}
