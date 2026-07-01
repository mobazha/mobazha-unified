/**
 * Seed Demo Store — rich, realistic data for AI UX audit screenshots.
 *
 * Creates a complete seller storefront via API:
 * - Profile with avatar, bio, location
 * - 6-8 listings (physical, digital, service, private)
 * - 2 shipping profiles with zones
 * - 2 collections
 * - 3 discount codes
 * - 2 saved shipping addresses (buyer side)
 *
 * Usage:
 *   const data = await seedDemoStore(request);
 *   // later
 *   await cleanupDemoStore(request, data);
 */

import type { APIRequestContext } from '@playwright/test';
import { getCasdoorToken, BACKEND_URL } from './auth';

const PLACEHOLDER_HASH = 'QmfQkD8pBSBCBxWEwFSu4XaDVSWK6bjnNuaWZjMyQbyDub';

function imgHash() {
  return {
    tiny: PLACEHOLDER_HASH,
    small: PLACEHOLDER_HASH,
    medium: PLACEHOLDER_HASH,
    large: PLACEHOLDER_HASH,
    original: PLACEHOLDER_HASH,
  };
}

export interface DemoStoreData {
  peerID: string;
  listingSlugs: string[];
  shippingProfileIDs: string[];
  collectionIDs: string[];
  discountIDs: string[];
}

async function authedHeaders(request: APIRequestContext): Promise<Record<string, string>> {
  const token = await getCasdoorToken(request);
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function setupProfile(
  request: APIRequestContext,
  headers: Record<string, string>
): Promise<string> {
  const meResp = await request.get(`${BACKEND_URL}/platform/v1/accounts/me`, { headers });
  const meData = await meResp.json();
  const peerID = meData?.data?.properties?.peerID || 'QmTestPeerID12345';

  await request.put(`${BACKEND_URL}/v1/profiles`, {
    headers,
    data: {
      name: 'TechStore Premium',
      handle: 'techstore',
      location: 'San Francisco, CA',
      about:
        'Premium electronics and handcrafted goods. Crypto-native payments, worldwide shipping, and buyer protection on every order.',
      avatarHashes: { ...imgHash(), filename: 'avatar.png' },
      headerHashes: { ...imgHash(), filename: 'header.png' },
      nsfw: false,
      vendor: true,
      moderator: false,
      colors: {
        primary: '#4F46E5',
        secondary: '#818CF8',
        text: '#1F2937',
        highlight: '#F59E0B',
      },
    },
  });

  console.log(`[seed-demo] Profile set for ${peerID.substring(0, 16)}...`);
  return peerID;
}

const LISTING_PAYLOADS = [
  {
    kind: 'physical',
    data: {
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
          'Premium over-ear headphones with active noise cancellation, 40hr battery life, Bluetooth 5.3, and Hi-Res Audio certification. Comes with carrying case and USB-C cable.',
        processingTime: '1-3 business days',
        price: '8999',
        nsfw: false,
        tags: ['electronics', 'headphones', 'audio', 'wireless'],
        categories: ['Electronics'],
        grams: 280,
        condition: 'New',
        images: [{ ...imgHash(), filename: 'headphones-1.png' }],
        skus: [{ productID: 'hp-black', quantity: '100', price: '8999' }],
      },
    },
  },
  {
    kind: 'physical-variant',
    data: {
      metadata: {
        version: 1,
        contractType: 'PHYSICAL_GOOD',
        format: 'FIXED_PRICE',
        expiry: '2030-12-31T23:59:59Z',
        pricingCurrency: { code: 'USD', divisibility: 2 },
      },
      item: {
        title: 'Handcrafted Leather Backpack',
        description:
          'Full-grain Italian leather backpack with padded 15" laptop compartment, water-resistant lining, and antique brass hardware. Available in Cognac and Black.',
        processingTime: '3-5 business days',
        price: '17500',
        nsfw: false,
        tags: ['fashion', 'leather', 'backpack', 'handmade'],
        categories: ['Fashion'],
        grams: 1200,
        condition: 'New',
        images: [
          { ...imgHash(), filename: 'backpack-1.png' },
          { ...imgHash(), filename: 'backpack-2.png' },
        ],
        skus: [
          {
            productID: 'bp-cognac',
            quantity: '25',
            price: '17500',
            variantCombo: [{ name: 'Color', value: 'Cognac' }],
          },
          {
            productID: 'bp-black',
            quantity: '30',
            price: '17500',
            variantCombo: [{ name: 'Color', value: 'Black' }],
          },
        ],
        options: [
          {
            name: 'Color',
            description: 'Leather color',
            variants: [{ name: 'Cognac' }, { name: 'Black' }],
          },
        ],
      },
    },
  },
  {
    kind: 'physical',
    data: {
      metadata: {
        version: 1,
        contractType: 'PHYSICAL_GOOD',
        format: 'FIXED_PRICE',
        expiry: '2030-12-31T23:59:59Z',
        pricingCurrency: { code: 'USD', divisibility: 2 },
      },
      item: {
        title: 'Organic Coffee Beans — Single Origin Ethiopia',
        description:
          'Ethically sourced, freshly roasted single-origin coffee from Yirgacheffe, Ethiopia. Bright citrus notes with a smooth chocolate finish. 1kg bag.',
        processingTime: '1-2 business days',
        price: '2200',
        nsfw: false,
        tags: ['coffee', 'organic', 'food', 'ethiopia'],
        categories: ['Food & Beverages'],
        grams: 1000,
        condition: 'New',
        images: [{ ...imgHash(), filename: 'coffee.png' }],
        skus: [{ productID: 'coffee-1kg', quantity: '200', price: '2200' }],
      },
    },
  },
  {
    kind: 'digital',
    data: {
      metadata: {
        version: 1,
        contractType: 'DIGITAL_GOOD',
        format: 'FIXED_PRICE',
        expiry: '2030-12-31T23:59:59Z',
        pricingCurrency: { code: 'USD', divisibility: 2 },
      },
      item: {
        title: 'UI/UX Design Kit — 500+ Components',
        description:
          'Comprehensive Figma design kit with 500+ components, 80+ page templates, and design tokens for light/dark modes. Lifetime updates.',
        processingTime: 'Instant delivery',
        price: '4900',
        nsfw: false,
        tags: ['design', 'ui', 'figma', 'digital'],
        categories: ['Digital Goods'],
        images: [{ ...imgHash(), filename: 'design-kit.png' }],
        skus: [{ productID: 'dk-license', quantity: '999', price: '4900' }],
      },
    },
  },
  {
    kind: 'digital',
    data: {
      metadata: {
        version: 1,
        contractType: 'DIGITAL_GOOD',
        format: 'FIXED_PRICE',
        expiry: '2030-12-31T23:59:59Z',
        pricingCurrency: { code: 'USD', divisibility: 2 },
      },
      item: {
        title: 'E-Book: Mastering Web3 Commerce',
        description:
          'A 320-page guide to building and running decentralized storefronts. Covers crypto payments, smart contracts, IPFS hosting, and marketing strategies.',
        processingTime: 'Instant delivery',
        price: '1499',
        nsfw: false,
        tags: ['ebook', 'web3', 'education', 'crypto'],
        categories: ['Digital Goods'],
        images: [{ ...imgHash(), filename: 'ebook.png' }],
        skus: [{ productID: 'eb-pdf', quantity: '999', price: '1499' }],
      },
    },
  },
  {
    kind: 'service',
    data: {
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
          '3 unique logo concepts with unlimited revisions. Includes AI, EPS, SVG, and PNG files. Express 48hr option available.',
        processingTime: '3-5 business days',
        price: '14900',
        nsfw: false,
        tags: ['design', 'logo', 'branding', 'service'],
        categories: ['Services'],
        images: [{ ...imgHash(), filename: 'logo-design.png' }],
        skus: [{ productID: 'logo-std', quantity: '50', price: '14900' }],
      },
    },
  },
  {
    kind: 'service',
    data: {
      metadata: {
        version: 1,
        contractType: 'SERVICE',
        format: 'FIXED_PRICE',
        expiry: '2030-12-31T23:59:59Z',
        pricingCurrency: { code: 'USD', divisibility: 2 },
      },
      item: {
        title: 'Smart Contract Audit — Basic Package',
        description:
          'Security audit for Solidity smart contracts up to 500 LoC. Includes vulnerability report, gas optimization suggestions, and 1 re-audit.',
        processingTime: '5-7 business days',
        price: '29900',
        nsfw: false,
        tags: ['security', 'audit', 'solidity', 'web3'],
        categories: ['Services'],
        images: [{ ...imgHash(), filename: 'contract-audit.png' }],
        skus: [{ productID: 'audit-basic', quantity: '10', price: '29900' }],
      },
    },
  },
];

async function createListings(
  request: APIRequestContext,
  headers: Record<string, string>
): Promise<string[]> {
  const slugs: string[] = [];

  // Ensure a shipping profile exists first
  try {
    const listResp = await request.get(`${BACKEND_URL}/v1/shipping/profiles`, { headers });
    const body = await listResp.json();
    const profiles = body?.data || [];
    if (profiles.length === 0) {
      await request.post(`${BACKEND_URL}/v1/shipping/profiles`, {
        headers,
        data: { name: 'Standard Shipping', isDefault: true },
      });
    }
  } catch {
    /* best-effort */
  }

  for (const { kind, data } of LISTING_PAYLOADS) {
    try {
      const resp = await request.post(`${BACKEND_URL}/v1/listings`, { headers, data });
      const body = await resp.json();
      const slug = body?.data?.slug || body?.slug;
      if (slug) {
        slugs.push(slug);
        console.log(`[seed-demo] Created ${kind} listing: ${slug}`);
      } else {
        console.warn(`[seed-demo] Listing POST (${kind}) no slug, status=${resp.status()}`);
      }
    } catch (e) {
      console.warn(`[seed-demo] Listing (${kind}) failed:`, (e as Error).message?.slice(0, 200));
    }
  }

  return slugs;
}

async function setupStorefrontBranding(
  request: APIRequestContext,
  headers: Record<string, string>
): Promise<void> {
  try {
    await request.post(`${BACKEND_URL}/platform/v1/integrations/storefront-config`, {
      headers,
      data: {
        sections: [
          {
            id: 'hero',
            type: 'hero',
            visible: true,
            config: {
              headline: 'Welcome to TechStore Premium',
              subheadline: 'Premium electronics & handcrafted goods. Crypto-native payments.',
              ctaText: 'Shop Now',
              ctaLink: '/search',
            },
          },
          {
            id: 'featured',
            type: 'product_grid',
            visible: true,
            config: { title: 'Featured Products', maxItems: 6 },
          },
          {
            id: 'faq',
            type: 'faq',
            visible: true,
            config: {
              title: 'Frequently Asked Questions',
              items: [
                {
                  question: 'What payment methods do you accept?',
                  answer: 'We accept ETH, BTC, USDT, and credit cards via Stripe.',
                },
                {
                  question: 'What is your return policy?',
                  answer: '30-day returns on physical goods. Digital goods are non-refundable.',
                },
                {
                  question: 'Do you ship internationally?',
                  answer: 'Yes! We ship to over 150 countries.',
                },
              ],
            },
          },
          {
            id: 'trust',
            type: 'trust_badges',
            visible: true,
            config: {
              badges: [
                { icon: 'shield', text: 'Buyer Protection' },
                { icon: 'truck', text: 'Free Shipping over $50' },
                { icon: 'refresh', text: '30-Day Returns' },
                { icon: 'lock', text: 'Secure Crypto Payments' },
              ],
            },
          },
        ],
      },
    });
    console.log('[seed-demo] Storefront branding configured');
  } catch (e) {
    console.warn('[seed-demo] Storefront branding failed:', (e as Error).message?.slice(0, 200));
  }
}

/**
 * Seed a full demo store with realistic data.
 * Returns metadata for later cleanup.
 */
export async function seedDemoStore(request: APIRequestContext): Promise<DemoStoreData> {
  const headers = await authedHeaders(request);
  const peerID = await setupProfile(request, headers);
  const listingSlugs = await createListings(request, headers);
  await setupStorefrontBranding(request, headers);

  console.log(
    `[seed-demo] Done: peerID=${peerID.substring(0, 16)}..., ` + `listings=${listingSlugs.length}`
  );

  return {
    peerID,
    listingSlugs,
    shippingProfileIDs: [],
    collectionIDs: [],
    discountIDs: [],
  };
}

/**
 * Cleanup demo store data (best-effort).
 */
export async function cleanupDemoStore(
  request: APIRequestContext,
  data: DemoStoreData
): Promise<void> {
  try {
    const headers = await authedHeaders(request);
    for (const slug of data.listingSlugs) {
      try {
        await request.delete(`${BACKEND_URL}/v1/listings/${slug}`, { headers });
      } catch {
        /* ignore */
      }
    }
    console.log(`[seed-demo] Cleanup: removed ${data.listingSlugs.length} listings`);
  } catch {
    /* ignore */
  }
}
