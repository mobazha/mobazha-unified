import type { CurationCategoryNode } from './types';

const PRESETS: Record<string, CurationCategoryNode[]> = {
  general: [
    { id: 'all', label: 'All' },
    { id: 'digital', label: 'Digital' },
    { id: 'services', label: 'Services' },
    { id: 'fashion', label: 'Fashion' },
  ],
  collectible: [
    { id: 'sports', label: 'Sports Cards' },
    { id: 'pokemon', label: 'Pokémon' },
    { id: 'mtg', label: 'Magic: The Gathering' },
    { id: 'tcg', label: 'Trading Cards' },
  ],
  fashion: [
    { id: 'streetwear', label: 'Streetwear' },
    { id: 'vintage', label: 'Vintage' },
    { id: 'accessories', label: 'Accessories' },
  ],
};

export function taxonomyForVertical(
  vertical: string,
  override?: CurationCategoryNode[]
): CurationCategoryNode[] {
  if (override?.length) return override;
  return PRESETS[vertical] ?? PRESETS.general;
}
