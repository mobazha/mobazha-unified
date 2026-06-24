import type { CurationCategoryNode, ListingFieldHint, VerticalId, VerticalPreset } from './types';

const COLLECTIBLE_TAXONOMY: CurationCategoryNode[] = [
  { id: 'sports', label: 'Sports Cards' },
  { id: 'pokemon', label: 'Pokémon' },
  { id: 'mtg', label: 'Magic: The Gathering' },
  { id: 'tcg', label: 'Trading Cards' },
];

const COLLECTIBLE_LISTING_HINTS: ListingFieldHint[] = [
  { id: 'player', label: 'Player / Character', placeholder: 'e.g. Mike Trout' },
  { id: 'year', label: 'Year', placeholder: 'e.g. 2020' },
  { id: 'set', label: 'Set / Series', placeholder: 'e.g. Topps Chrome' },
  { id: 'cardNumber', label: 'Card number', placeholder: 'e.g. #150' },
  { id: 'grader', label: 'Grading company', placeholder: 'PSA / BGS / CGC / SGC' },
  { id: 'grade', label: 'Grade', placeholder: 'e.g. 10' },
  { id: 'condition', label: 'Condition (raw)', placeholder: 'NM / LP — if ungraded' },
];

const PRESETS: Record<string, VerticalPreset> = {
  general: {
    id: 'general',
    taxonomy: [
      { id: 'all', label: 'All' },
      { id: 'digital', label: 'Digital' },
      { id: 'services', label: 'Services' },
      { id: 'fashion', label: 'Fashion' },
    ],
    listingHints: [],
    paymentDefaults: ['crypto', 'fiat'],
    trustCopy: 'standard',
    modules: [],
  },
  collectible: {
    id: 'collectible',
    taxonomy: COLLECTIBLE_TAXONOMY,
    listingHints: COLLECTIBLE_LISTING_HINTS,
    paymentDefaults: ['crypto', 'fiat'],
    trustCopy: 'buyerProtectionNotAuthentication',
    modules: [],
  },
  fashion: {
    id: 'fashion',
    taxonomy: [
      { id: 'streetwear', label: 'Streetwear' },
      { id: 'vintage', label: 'Vintage' },
      { id: 'accessories', label: 'Accessories' },
    ],
    listingHints: [
      { id: 'brand', label: 'Brand' },
      { id: 'size', label: 'Size' },
      { id: 'condition', label: 'Condition' },
    ],
    paymentDefaults: ['crypto', 'fiat'],
    trustCopy: 'standard',
    modules: [],
  },
};

/** Registry for marketplace onboarding / listing defaults (P0-1). */
export const VERTICAL_PRESETS: Record<VerticalId, VerticalPreset> = PRESETS;

export function presetForVertical(vertical: string): VerticalPreset {
  return PRESETS[vertical] ?? PRESETS.general;
}

export function taxonomyForVertical(
  vertical: string,
  override?: CurationCategoryNode[]
): CurationCategoryNode[] {
  if (override?.length) return override;
  return presetForVertical(vertical).taxonomy;
}
