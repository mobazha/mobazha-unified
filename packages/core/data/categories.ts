/**
 * Predefined product categories for marketplace listings.
 *
 * These provide a curated set of common e-commerce categories as suggestions
 * when sellers create/edit products. Sellers can also create custom categories.
 *
 * Categories are organized by top-level groups. The flat list is used for
 * autocomplete suggestions in the TokenInput component.
 */

export interface CategoryGroup {
  /** Group name (for display purposes, not stored) */
  group: string;
  /** Categories within this group */
  categories: string[];
}

/**
 * Predefined category groups with their categories.
 * Used for structured browsing or grouped suggestions.
 */
export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    group: 'Electronics',
    categories: [
      'Electronics',
      'Computers & Tablets',
      'Smartphones & Accessories',
      'Audio & Headphones',
      'Cameras & Photography',
      'Gaming',
      'Wearable Technology',
      'TV & Home Theater',
    ],
  },
  {
    group: 'Fashion',
    categories: [
      'Clothing',
      'Shoes',
      'Jewelry & Watches',
      'Bags & Accessories',
      'Sunglasses & Eyewear',
    ],
  },
  {
    group: 'Home & Garden',
    categories: [
      'Home & Garden',
      'Furniture',
      'Kitchen & Dining',
      'Bedding & Bath',
      'Tools & Hardware',
      'Pet Supplies',
    ],
  },
  {
    group: 'Health & Beauty',
    categories: ['Health & Beauty', 'Skincare', 'Supplements & Vitamins', 'Fitness & Sports'],
  },
  {
    group: 'Art & Collectibles',
    categories: ['Art', 'Collectibles', 'Antiques', 'Handmade & Crafts'],
  },
  {
    group: 'Books & Media',
    categories: ['Books', 'Music', 'Movies & TV', 'Magazines'],
  },
  {
    group: 'Digital Goods',
    categories: [
      'Digital Goods',
      'Software & Apps',
      'Digital Art & NFTs',
      'E-books',
      'Online Courses',
      'Templates & Themes',
    ],
  },
  {
    group: 'Crypto & Web3',
    categories: ['Crypto Merchandise', 'Hardware Wallets', 'Mining Equipment', 'RWA Tokens'],
  },
  {
    group: 'Food & Beverages',
    categories: ['Food & Beverages', 'Coffee & Tea', 'Snacks & Sweets', 'Organic & Natural'],
  },
  {
    group: 'Toys & Hobbies',
    categories: ['Toys & Games', 'Board Games', 'Model Kits', 'Outdoor & Recreation'],
  },
  {
    group: 'Automotive',
    categories: ['Automotive', 'Car Accessories', 'Motorcycle Parts'],
  },
  {
    group: 'Office & Business',
    categories: ['Office Supplies', 'Business Services', 'Printing & Stationery'],
  },
  {
    group: 'Other',
    categories: ['Other', 'Gift Cards', 'Services', 'Experiences'],
  },
];

/**
 * Flat list of all predefined categories, sorted alphabetically.
 * Used as suggestions in the category autocomplete input.
 */
export const PREDEFINED_CATEGORIES: string[] = CATEGORY_GROUPS.flatMap(
  group => group.categories
).sort((a, b) => a.localeCompare(b));

/**
 * Get categories for a specific group.
 */
export function getCategoriesByGroup(groupName: string): string[] {
  const group = CATEGORY_GROUPS.find(g => g.group === groupName);
  return group ? group.categories : [];
}

/**
 * Check if a category is predefined.
 */
export function isPredefinedCategory(category: string): boolean {
  return PREDEFINED_CATEGORIES.includes(category);
}
