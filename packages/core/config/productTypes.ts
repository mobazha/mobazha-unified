/**
 * Standard product type values for the productType field.
 * Sellers can also enter custom values not in this list.
 * English values are stored; UI renders via i18n (key: productType.{value}).
 */
export const STANDARD_PRODUCT_TYPES = [
  'Electronics',
  'Clothing & Apparel',
  'Home & Garden',
  'Health & Beauty',
  'Books & Media',
  'Toys & Games',
  'Sports & Outdoors',
  'Food & Beverages',
  'Jewelry & Watches',
  'Art & Collectibles',
  'Digital Goods',
  'Services',
  'Handmade',
  'Vintage',
  'Other',
] as const;

export type StandardProductType = (typeof STANDARD_PRODUCT_TYPES)[number];
