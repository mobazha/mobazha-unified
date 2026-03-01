/**
 * Seed Visual Test Data
 * 为视觉回归测试注入数据（购物车、商品列表）
 *
 * 购物车数据通过 localStorage 注入（Zustand persist），不依赖 API。
 * 商品创建为 best-effort，失败时不阻塞测试。
 */

import type { APIRequestContext, Page } from '@playwright/test';
import { getCasdoorToken, BACKEND_URL } from './auth';

const PLACEHOLDER_HASH = 'QmfQkD8pBSBCBxWEwFSu4XaDVSWK6bjnNuaWZjMyQbyDub';

function picsumUrl(id: number, size = 300) {
  return `https://picsum.photos/id/${id}/${size}/${size}`;
}

interface MockImage {
  tiny: string;
  small: string;
  medium: string;
  large: string;
  original: string;
  filename: string;
}

const MOCK_IMAGES: MockImage[] = [
  {
    tiny: PLACEHOLDER_HASH,
    small: PLACEHOLDER_HASH,
    medium: PLACEHOLDER_HASH,
    large: PLACEHOLDER_HASH,
    original: PLACEHOLDER_HASH,
    filename: 'headphones.png',
  },
  {
    tiny: PLACEHOLDER_HASH,
    small: PLACEHOLDER_HASH,
    medium: PLACEHOLDER_HASH,
    large: PLACEHOLDER_HASH,
    original: PLACEHOLDER_HASH,
    filename: 'logo-design.png',
  },
];

const CART_IMAGES = [
  {
    tiny: picsumUrl(3),
    small: picsumUrl(3),
    medium: picsumUrl(3),
    large: picsumUrl(3),
    original: picsumUrl(3),
  },
  {
    tiny: picsumUrl(24),
    small: picsumUrl(24),
    medium: picsumUrl(24),
    large: picsumUrl(24),
    original: picsumUrl(24),
  },
];

export interface SeededVisualData {
  listings: Array<{
    slug: string;
    title: string;
    price: string;
    priceCurrency: string;
    contractType: string;
    image: MockImage;
  }>;
  peerID: string;
}

async function tryGetPeerID(request: APIRequestContext): Promise<string> {
  try {
    const token = await getCasdoorToken(request);
    const resp = await request.get(`${BACKEND_URL}/platform/v1/accounts/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await resp.json();
    return data?.data?.properties?.peerID || data?.properties?.peerID || 'QmTestPeerID12345';
  } catch {
    return 'QmTestPeerID12345';
  }
}

async function tryCreateListings(request: APIRequestContext): Promise<string[]> {
  try {
    const token = await getCasdoorToken(request);
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const listingPayloads = [
      {
        metadata: {
          version: 1,
          contractType: 'PHYSICAL_GOOD',
          format: 'FIXED_PRICE',
          expiry: '2030-12-31T23:59:59Z',
          pricingCurrency: { code: 'USD', divisibility: 2 },
        },
        item: {
          title: 'Wireless Noise-Cancelling Headphones',
          description:
            'Premium over-ear headphones with active noise cancellation, 40hr battery, and Bluetooth 5.3.',
          processingTime: '1-3 business days',
          price: '8999',
          nsfw: false,
          tags: ['electronics', 'headphones'],
          categories: ['Electronics'],
          grams: 280,
          condition: 'New',
          images: [MOCK_IMAGES[0]],
          skus: [{ productID: '1', quantity: '100', price: '8999' }],
        },
        shippingOptions: [
          {
            name: 'Standard Shipping',
            type: 'FIXED_PRICE',
            currency: 'USD',
            regions: ['ALL'],
            services: [{ name: 'Standard', estimatedDelivery: '5-7 days', firstFreight: '599' }],
          },
        ],
      },
      {
        metadata: {
          version: 1,
          contractType: 'SERVICE',
          format: 'FIXED_PRICE',
          expiry: '2030-12-31T23:59:59Z',
          pricingCurrency: { code: 'USD', divisibility: 2 },
        },
        item: {
          title: 'Professional Logo Design Package',
          description:
            '3 unique concepts with unlimited revisions. AI, EPS, SVG, PNG files included.',
          processingTime: '3-5 business days',
          price: '14900',
          nsfw: false,
          tags: ['design', 'logo'],
          categories: ['Services'],
          images: [MOCK_IMAGES[1]],
          skus: [{ productID: '1', quantity: '50', price: '14900' }],
        },
      },
    ];

    const slugs: string[] = [];
    for (const payload of listingPayloads) {
      try {
        const resp = await request.post(`${BACKEND_URL}/v1/listings`, {
          headers,
          data: payload,
        });
        const body = await resp.json();
        const slug = body?.data?.slug || body?.slug;
        if (slug) slugs.push(slug);
      } catch (e) {
        console.warn('Listing creation failed:', e);
      }
    }
    return slugs;
  } catch {
    return [];
  }
}

/**
 * Seed visual test data. Creates listings via API (best-effort) and
 * returns data for cart injection.
 */
export async function seedVisualTestData(request: APIRequestContext): Promise<SeededVisualData> {
  const peerID = await tryGetPeerID(request);
  const slugs = await tryCreateListings(request);

  const listings: SeededVisualData['listings'] = [
    {
      slug: slugs[0] || 'wireless-noise-cancelling-headphones',
      title: 'Wireless Noise-Cancelling Headphones',
      price: '8999',
      priceCurrency: 'USD',
      contractType: 'PHYSICAL_GOOD',
      image: MOCK_IMAGES[0],
    },
    {
      slug: slugs[1] || 'professional-logo-design-package',
      title: 'Professional Logo Design Package',
      price: '14900',
      priceCurrency: 'USD',
      contractType: 'SERVICE',
      image: MOCK_IMAGES[1],
    },
  ];

  return { listings, peerID };
}

/**
 * Inject cart items into localStorage (Zustand persist format).
 * Call after navigating to any page so the origin matches.
 */
export async function injectCartData(page: Page, data: SeededVisualData): Promise<void> {
  const cartItems = data.listings.map((listing, idx) => ({
    listing: {
      slug: listing.slug,
      title: listing.title,
      thumbnail: CART_IMAGES[idx] || CART_IMAGES[0],
      price: {
        amount: parseInt(listing.price, 10),
        currency: { code: listing.priceCurrency, divisibility: 2 },
      },
      vendorPeerID: data.peerID,
      vendorHandle: 'TestStore',
    },
    quantity: listing.contractType === 'SERVICE' ? 1 : 2,
  }));

  const cartState = {
    state: { items: cartItems, isLoading: false },
    version: 0,
  };

  await page.evaluate(json => {
    localStorage.setItem('mobazha-cart-storage', json);
  }, JSON.stringify(cartState));
}

/**
 * Cleanup created listings (best-effort).
 */
export async function cleanupVisualTestData(
  request: APIRequestContext,
  data: SeededVisualData
): Promise<void> {
  try {
    const token = await getCasdoorToken(request);
    const headers = { Authorization: `Bearer ${token}` };
    for (const listing of data.listings) {
      try {
        await request.delete(`${BACKEND_URL}/v1/listings/${listing.slug}`, { headers });
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
}
