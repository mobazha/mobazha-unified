// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

export interface NativeMarketplaceAttributionParams {
  source?: string;
  medium?: string;
  campaign?: string;
  referrerHost?: string;
}
export interface NativeMarketplaceJourneyState extends NativeMarketplaceAttributionParams {
  journeyID: string;
}

const UTM_MAX_LENGTH = 80;
const REFERRER_HOST_MAX_LENGTH = 255;
const UTM_ALLOWED_CHARS = /[^a-zA-Z0-9 ._:-]/g;
const HOST_ALLOWED_CHARS = /[^a-z0-9.-]/g;
const RFC4122_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UTM_SEARCH_KEYS = ['utm_source', 'utm_medium', 'utm_campaign'] as const;

export type NativeMarketplaceUtmSearchKey = (typeof UTM_SEARCH_KEYS)[number];

export function nativeMarketplaceAttributionStorageKey(marketplaceID: string): string {
  return `mobazha_native_marketplace_attribution:${marketplaceID}`;
}

export function nativeMarketplaceAttributionEventDedupStorageKey(marketplaceID: string): string {
  return `mobazha_native_marketplace_attribution_events:${marketplaceID}`;
}

export function sanitizeNativeMarketplaceUtmValue(raw: string): string {
  return raw.replace(UTM_ALLOWED_CHARS, '').trim().slice(0, UTM_MAX_LENGTH);
}

export function sanitizeNativeMarketplaceReferrerHost(raw: string): string {
  return raw
    .toLowerCase()
    .replace(HOST_ALLOWED_CHARS, '')
    .trim()
    .slice(0, REFERRER_HOST_MAX_LENGTH);
}

export function parseNativeMarketplaceUtmFromSearchParams(
  searchParams: URLSearchParams
): Pick<NativeMarketplaceAttributionParams, 'source' | 'medium' | 'campaign'> {
  const result: Pick<NativeMarketplaceAttributionParams, 'source' | 'medium' | 'campaign'> = {};

  const source = searchParams.get('utm_source');
  if (source) {
    const cleaned = sanitizeNativeMarketplaceUtmValue(source);
    if (cleaned) result.source = cleaned;
  }

  const medium = searchParams.get('utm_medium');
  if (medium) {
    const cleaned = sanitizeNativeMarketplaceUtmValue(medium);
    if (cleaned) result.medium = cleaned;
  }

  const campaign = searchParams.get('utm_campaign');
  if (campaign) {
    const cleaned = sanitizeNativeMarketplaceUtmValue(campaign);
    if (cleaned) result.campaign = cleaned;
  }

  return result;
}

export function parseReferrerHost(referrer: string): string | undefined {
  if (!referrer) return undefined;
  try {
    const host = new URL(referrer).hostname;
    const cleaned = sanitizeNativeMarketplaceReferrerHost(host);
    return cleaned || undefined;
  } catch {
    return undefined;
  }
}

export function readNativeMarketplaceJourneyState(
  marketplaceID: string
): NativeMarketplaceJourneyState | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(nativeMarketplaceAttributionStorageKey(marketplaceID));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<NativeMarketplaceJourneyState>;
    if (
      !parsed?.journeyID ||
      typeof parsed.journeyID !== 'string' ||
      !RFC4122_UUID_PATTERN.test(parsed.journeyID)
    ) {
      return null;
    }

    const state: NativeMarketplaceJourneyState = { journeyID: parsed.journeyID };
    if (typeof parsed.source === 'string') {
      const cleaned = sanitizeNativeMarketplaceUtmValue(parsed.source);
      if (cleaned) state.source = cleaned;
    }
    if (typeof parsed.medium === 'string') {
      const cleaned = sanitizeNativeMarketplaceUtmValue(parsed.medium);
      if (cleaned) state.medium = cleaned;
    }
    if (typeof parsed.campaign === 'string') {
      const cleaned = sanitizeNativeMarketplaceUtmValue(parsed.campaign);
      if (cleaned) state.campaign = cleaned;
    }
    if (typeof parsed.referrerHost === 'string') {
      const cleaned = sanitizeNativeMarketplaceReferrerHost(parsed.referrerHost);
      if (cleaned) state.referrerHost = cleaned;
    }
    return state;
  } catch {
    return null;
  }
}

export function writeNativeMarketplaceJourneyState(
  marketplaceID: string,
  state: NativeMarketplaceJourneyState
): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(
      nativeMarketplaceAttributionStorageKey(marketplaceID),
      JSON.stringify(state)
    );
  } catch {
    // Best-effort only: storage write failures must never block journey creation.
  }
}

export function generateAttributionUUID(): string {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    try {
      const randomUUID = globalThis.crypto.randomUUID();
      if (RFC4122_UUID_PATTERN.test(randomUUID)) {
        return randomUUID;
      }
    } catch {
      // Continue to fallback generators.
    }
  }

  const bytes = new Uint8Array(16);

  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.getRandomValues === 'function'
  ) {
    try {
      globalThis.crypto.getRandomValues(bytes);
    } catch {
      for (let index = 0; index < bytes.length; index += 1) {
        bytes[index] = Math.floor(Math.random() * 256);
      }
    }
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  // RFC4122 v4: set version and variant bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function getOrCreateNativeMarketplaceJourneyState(input: {
  marketplaceID: string;
  searchParams: URLSearchParams;
  referrer: string;
}): NativeMarketplaceJourneyState {
  const existing = readNativeMarketplaceJourneyState(input.marketplaceID);
  if (existing) return existing;

  const utm = parseNativeMarketplaceUtmFromSearchParams(input.searchParams);
  const referrerHost = parseReferrerHost(input.referrer);
  const created: NativeMarketplaceJourneyState = {
    journeyID: generateAttributionUUID(),
    ...utm,
    ...(referrerHost ? { referrerHost } : {}),
  };
  writeNativeMarketplaceJourneyState(input.marketplaceID, created);
  return created;
}

export function readNativeMarketplaceSentEventKeys(marketplaceID: string): string[] {
  if (typeof sessionStorage === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(
      nativeMarketplaceAttributionEventDedupStorageKey(marketplaceID)
    );
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

export function writeNativeMarketplaceSentEventKeys(marketplaceID: string, keys: string[]): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(
      nativeMarketplaceAttributionEventDedupStorageKey(marketplaceID),
      JSON.stringify(keys)
    );
  } catch {
    // Best-effort only: storage write failures must never block browse/checkout flow.
  }
}
