export type CollectibleMarketplaceCategoryFilter = 'all' | 'sports' | 'pokemon' | 'mtg' | 'tcg';

export const COLLECTIBLE_MARKETPLACE_CATEGORY_FILTERS: CollectibleMarketplaceCategoryFilter[] = [
  'all',
  'sports',
  'pokemon',
  'mtg',
  'tcg',
];

export interface CollectibleListingMatchInput {
  title: string;
  categories?: readonly string[];
  tags?: readonly string[];
}

export const COLLECTIBLE_ATTRIBUTION_KEYS = [
  'ref',
  'utm_source',
  'utm_medium',
  'utm_campaign',
] as const;

export type CollectibleAttributionKey = (typeof COLLECTIBLE_ATTRIBUTION_KEYS)[number];

export type CollectibleAttributionParams = Partial<Record<CollectibleAttributionKey, string>>;

export const COLLECTIBLE_ATTRIBUTION_STORAGE_KEY = 'mobazha_collectible_marketplace_attribution';

const ATTRIBUTION_MAX_LENGTH = 80;

const SPORTS_KEYWORDS = [
  'sport',
  'sports',
  'baseball',
  'basketball',
  'football',
  'hockey',
  'soccer',
  'topps',
  'panini',
  'bowman',
  'donruss',
  'prizm',
  'upper deck',
] as const;

const POKEMON_KEYWORDS = ['pokemon', 'pokémon', 'pikachu', 'charizard'] as const;

const MTG_KEYWORDS = ['mtg', 'magic the gathering', 'magic:'] as const;

const OTHER_TCG_KEYWORDS = [
  'tcg',
  'trading card',
  'yugioh',
  'yu-gi-oh',
  'digimon',
  'lorcana',
  'one piece',
  'flesh and blood',
  'fab',
  'dragon ball',
  'weiss schwarz',
] as const;

function collectibleSearchBlob(input: CollectibleListingMatchInput): string {
  return [input.title, ...(input.categories ?? []), ...(input.tags ?? [])].join(' ').toLowerCase();
}

function includesKeyword(blob: string, keywords: readonly string[]): boolean {
  return keywords.some(keyword => blob.includes(keyword.toLowerCase()));
}

function matchesSports(blob: string): boolean {
  return includesKeyword(blob, SPORTS_KEYWORDS);
}

function matchesPokemon(blob: string): boolean {
  return includesKeyword(blob, POKEMON_KEYWORDS);
}

function matchesMtg(blob: string): boolean {
  return includesKeyword(blob, MTG_KEYWORDS);
}

function matchesOtherTcg(blob: string): boolean {
  if (matchesSports(blob) || matchesPokemon(blob) || matchesMtg(blob)) {
    return false;
  }
  return includesKeyword(blob, OTHER_TCG_KEYWORDS);
}

/** Case-insensitive category match against listing title, categories, and tags. */
export function collectibleListingMatchesCategoryFilter(
  input: CollectibleListingMatchInput,
  filter: CollectibleMarketplaceCategoryFilter
): boolean {
  if (filter === 'all') return true;

  const blob = collectibleSearchBlob(input);
  switch (filter) {
    case 'sports':
      return matchesSports(blob);
    case 'pokemon':
      return matchesPokemon(blob);
    case 'mtg':
      return matchesMtg(blob);
    case 'tcg':
      return matchesOtherTcg(blob);
    default:
      return true;
  }
}

export function filterCollectibleListingPreviews<T extends CollectibleListingMatchInput>(
  listings: T[],
  filter: CollectibleMarketplaceCategoryFilter
): T[] {
  if (filter === 'all') return listings;
  return listings.filter(item => collectibleListingMatchesCategoryFilter(item, filter));
}

/** Sanitize attribution values: alnum, space, dot, underscore, hyphen; max 80 chars. */
export function sanitizeCollectibleAttributionValue(raw: string): string {
  return raw
    .replace(/[^a-zA-Z0-9 ._-]/g, '')
    .trim()
    .slice(0, ATTRIBUTION_MAX_LENGTH);
}

export function parseCollectibleAttributionFromSearchParams(
  searchParams: URLSearchParams | Record<string, string | null | undefined>
): CollectibleAttributionParams {
  const result: CollectibleAttributionParams = {};

  for (const key of COLLECTIBLE_ATTRIBUTION_KEYS) {
    const raw = searchParams instanceof URLSearchParams ? searchParams.get(key) : searchParams[key];
    if (!raw) continue;
    const cleaned = sanitizeCollectibleAttributionValue(raw);
    if (cleaned) result[key] = cleaned;
  }

  return result;
}

export function mergeCollectibleAttribution(
  existing: CollectibleAttributionParams,
  incoming: CollectibleAttributionParams
): CollectibleAttributionParams {
  const merged: CollectibleAttributionParams = { ...existing };
  for (const key of COLLECTIBLE_ATTRIBUTION_KEYS) {
    if (incoming[key]) merged[key] = incoming[key];
  }
  return merged;
}

export function readCollectibleAttributionFromSessionStorage(): CollectibleAttributionParams {
  if (typeof sessionStorage === 'undefined') return {};

  try {
    const raw = sessionStorage.getItem(COLLECTIBLE_ATTRIBUTION_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: CollectibleAttributionParams = {};
    for (const key of COLLECTIBLE_ATTRIBUTION_KEYS) {
      const value = parsed[key];
      if (typeof value !== 'string') continue;
      const cleaned = sanitizeCollectibleAttributionValue(value);
      if (cleaned) result[key] = cleaned;
    }
    return result;
  } catch {
    return {};
  }
}

export function writeCollectibleAttributionToSessionStorage(
  params: CollectibleAttributionParams
): void {
  if (typeof sessionStorage === 'undefined') return;

  const cleaned: CollectibleAttributionParams = {};
  for (const key of COLLECTIBLE_ATTRIBUTION_KEYS) {
    if (params[key]) cleaned[key] = params[key];
  }

  if (Object.keys(cleaned).length === 0) {
    sessionStorage.removeItem(COLLECTIBLE_ATTRIBUTION_STORAGE_KEY);
    return;
  }

  sessionStorage.setItem(COLLECTIBLE_ATTRIBUTION_STORAGE_KEY, JSON.stringify(cleaned));
}

/** Append only whitelisted attribution params to a product href. */
export function appendCollectibleAttributionToHref(
  href: string,
  params: CollectibleAttributionParams
): string {
  const entries = COLLECTIBLE_ATTRIBUTION_KEYS.flatMap(key => {
    const value = params[key];
    return value ? ([[key, value]] as const) : [];
  });
  if (entries.length === 0) return href;

  const [path, existingQuery = ''] = href.split('?');
  const search = new URLSearchParams(existingQuery);
  for (const [key, value] of entries) {
    search.set(key, value);
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

/** Test-only local demo card art keyed by exact listing slug (no runtime hotlinking). */
export const COLLECTIBLE_DEMO_CARD_IMAGE_BY_SLUG = {
  'm2-wilson-sports-card-demo-001-psa-10-testnet':
    '/images/demo-cards/m2-wilson-sports-card-demo-001-psa-10-testnet.jpg',
  'm2-wilson-pokemon-card-demo-002-psa-9-testnet':
    '/images/demo-cards/m2-wilson-pokemon-card-demo-002-psa-9-testnet.jpg',
  'm2-wilson-mtg-card-demo-003-psa-10-testnet':
    '/images/demo-cards/m2-wilson-mtg-card-demo-003-psa-10-testnet.jpg',
} as const;

export type CollectibleDemoCardSlug = keyof typeof COLLECTIBLE_DEMO_CARD_IMAGE_BY_SLUG;

export function getCollectibleDemoCardImageUrl(slug: string): string | undefined {
  return COLLECTIBLE_DEMO_CARD_IMAGE_BY_SLUG[slug as CollectibleDemoCardSlug];
}

export function isCollectibleDemoCardImageUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return url.startsWith('/images/demo-cards/');
}

/** Shared dead placeholder CID on seeded demo listings (image 404 / naturalWidth 0). */
export const COLLECTIBLE_DEMO_DEAD_PLACEHOLDER_CID =
  'QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n';

export function isCollectibleDemoDeadPlaceholderImageUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return url.includes(COLLECTIBLE_DEMO_DEAD_PLACEHOLDER_CID);
}

/** Prefer API image; fall back to bundled demo card art for known test slugs only. */
export function resolveCollectibleListingImageUrl(
  slug: string,
  apiImageUrl: string | undefined | null
): string | undefined {
  const demoArt = getCollectibleDemoCardImageUrl(slug);

  if (apiImageUrl) {
    if (demoArt && isCollectibleDemoDeadPlaceholderImageUrl(apiImageUrl)) {
      return demoArt;
    }
    return apiImageUrl;
  }

  return demoArt;
}
