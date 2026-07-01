/**
 * Seed Listings for E2E Tests
 * 创建测试商品种子数据（物理/服务/数字）
 *
 * Usage:
 *   import { seedTestListings, cleanupTestListings } from './fixtures/seed-listings';
 *   const listings = await seedTestListings(api);
 *   // ... run tests ...
 *   await cleanupTestListings(api, listings);
 */

import type { StandaloneApi } from './standalone-auth';

/** Minimal 1x1 red PNG as base64 (valid image for IPFS upload) */
const RED_PIXEL_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

/** Minimal 1x1 blue PNG */
const BLUE_PIXEL_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==';

/** Minimal 1x1 green PNG */
const GREEN_PIXEL_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

export interface SeededListing {
  slug: string;
  title: string;
  contractType: string;
  price: string;
}

export const EXPECTED_SLUGS = {
  physical: 'e2e-test-t-shirt',
  service: 'e2e-web-design-consultation',
  digital: 'e2e-premium-icon-pack',
} as const;

interface ImageHashes {
  tiny: string;
  small: string;
  medium: string;
  large: string;
  original: string;
  filename: string;
}

async function uploadImage(
  api: StandaloneApi,
  base64: string,
  filename: string
): Promise<ImageHashes> {
  const result = await api.uploadProductImage(base64, filename);
  if (Array.isArray(result) && result.length > 0) {
    return result[0] as ImageHashes;
  }
  throw new Error(`Image upload failed: ${JSON.stringify(result)}`);
}

function physicalListing(image: ImageHashes) {
  return {
    metadata: {
      version: 1,
      contractType: 'PHYSICAL_GOOD',
      format: 'FIXED_PRICE',
      expiry: '2030-12-31T23:59:59Z',
      pricingCurrency: { code: 'USD', divisibility: 2 },
    },
    item: {
      title: 'E2E Test T-Shirt',
      description: 'A comfortable cotton t-shirt for E2E testing. Available in multiple sizes.',
      processingTime: '3-5 business days',
      price: '2999',
      nsfw: false,
      tags: ['e2e-test', 'clothing', 'tshirt'],
      categories: ['Clothing'],
      grams: 200,
      condition: 'New',
      images: [image],
      skus: [{ productID: '1', quantity: '50', price: '2999' }],
    },
    shippingProfile: {
      profileId: 'sp-standard',
      name: 'Default Shipping',
      isDefault: true,
      locationGroups: [
        {
          id: 'lg-default',
          locationIds: [],
          zones: [
            {
              id: 'zone-standard',
              name: 'Standard Shipping',
              regions: ['ALL'],
              rates: [
                {
                  id: 'rate-standard',
                  name: 'Standard',
                  price: '499',
                  currency: 'USD',
                  estimatedDelivery: '5-7 business days',
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

function serviceListing(image: ImageHashes) {
  return {
    metadata: {
      version: 1,
      contractType: 'SERVICE',
      format: 'FIXED_PRICE',
      expiry: '2030-12-31T23:59:59Z',
      pricingCurrency: { code: 'USD', divisibility: 2 },
    },
    item: {
      title: 'E2E Web Design Consultation',
      description: 'One-hour professional web design consultation for E2E testing.',
      processingTime: '1-2 business days',
      price: '9900',
      nsfw: false,
      tags: ['e2e-test', 'service', 'consulting'],
      categories: ['Services'],
      images: [image],
      skus: [{ productID: '1', quantity: '20', price: '9900' }],
    },
  };
}

function digitalListing(image: ImageHashes) {
  return {
    metadata: {
      version: 1,
      contractType: 'DIGITAL_GOOD',
      format: 'FIXED_PRICE',
      expiry: '2030-12-31T23:59:59Z',
      pricingCurrency: { code: 'USD', divisibility: 2 },
    },
    item: {
      title: 'E2E Premium Icon Pack',
      description: '500+ premium vector icons for web and mobile. Instant digital delivery.',
      processingTime: 'Instant delivery',
      price: '1499',
      nsfw: false,
      tags: ['e2e-test', 'digital', 'icons', 'design'],
      categories: ['Digital Goods'],
      images: [image],
      skus: [{ productID: '1', quantity: '999', price: '1499' }],
    },
  };
}

/**
 * Create 3 test listings (physical, service, digital) via the API.
 * Uploads placeholder images first, then creates each listing.
 */
export async function seedTestListings(api: StandaloneApi): Promise<SeededListing[]> {
  const [img1, img2, img3] = await Promise.all([
    uploadImage(api, RED_PIXEL_PNG, 'tshirt.png'),
    uploadImage(api, BLUE_PIXEL_PNG, 'consultation.png'),
    uploadImage(api, GREEN_PIXEL_PNG, 'icons.png'),
  ]);

  const definitions = [
    { builder: physicalListing, image: img1 },
    { builder: serviceListing, image: img2 },
    { builder: digitalListing, image: img3 },
  ];

  const results: SeededListing[] = [];

  for (const { builder, image } of definitions) {
    const payload = builder(image);
    const resp = await api.createListing(payload as unknown as Record<string, unknown>);

    if (resp && resp.slug) {
      results.push({
        slug: resp.slug,
        title: payload.item.title,
        contractType: payload.metadata.contractType,
        price: payload.item.price,
      });
    } else {
      console.warn('Failed to create listing:', JSON.stringify(resp));
    }
  }

  return results;
}

/**
 * Delete all seeded test listings.
 */
export async function cleanupTestListings(
  api: StandaloneApi,
  listings: SeededListing[]
): Promise<void> {
  for (const listing of listings) {
    try {
      await api.deleteListing(listing.slug);
    } catch {
      console.warn(`Failed to delete listing: ${listing.slug}`);
    }
  }
}
