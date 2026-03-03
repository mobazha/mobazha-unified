/**
 * Standalone Store Journey — 10-step narrative screenshot capture for AI UX audit.
 *
 * Runs against real standalone backend (e2e-standalone on :15104, frontend on :3002).
 * Captures: anonymous browsing, seller login, admin dashboard.
 *
 * Prerequisites:
 *   - Docker E2E stack running (make up in mobazha3.0/tests/e2e/docker/)
 *   - Standalone frontend: pnpm dev --mode standalone --port 3002
 *   - Seed data: profile + listings created via API
 *
 * Run: PLAYWRIGHT_BROWSERS_PATH="$HOME/Library/Caches/ms-playwright" \
 *      npx playwright test demo-standalone-journey --project=standalone
 */

import { test, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

// ─── Config ─────────────────────────────────────────────────────────

const PEER_ID = '12D3KooWSjgKktH9R2jQMNiKrKqQiu1aJR2NnBAgZvkDQyto4p7x';
const SELLER_USER = 'admin';
const SELLER_PASS = 'e2e-standalone-pass';

const LISTING_SLUGS = [
  'premium-wireless-headphones',
  'ui-ux-design-masterclass',
  'pro-photo-editor-license',
  'blockchain-commerce-guide',
];

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1280, height: 800 },
};

const OUTPUT_DIR = path.join(__dirname, 'demo-output', 'standalone');

interface StepMeta {
  id: string;
  title: string;
  description: string;
  phase: string;
  reviewFocus: string;
}

const STEPS: StepMeta[] = [
  {
    id: '01-homepage',
    title: 'Standalone Homepage',
    description: 'Anonymous homepage with StoreHero + branding.',
    phase: 'Anonymous Browse',
    reviewFocus: 'Brand independence (not SaaS sub-page), StoreHero appeal.',
  },
  {
    id: '02-browse',
    title: 'Browse Products',
    description: 'Anonymous product list browsing.',
    phase: 'Anonymous Browse',
    reviewFocus: 'No login required to browse, product card quality.',
  },
  {
    id: '03-product',
    title: 'Product Detail',
    description: 'Anonymous product detail view.',
    phase: 'Anonymous Browse',
    reviewFocus: 'Price/description/image completeness, add-to-cart state.',
  },
  {
    id: '04-cart',
    title: 'Cart',
    description: 'Add-to-cart + cart page.',
    phase: 'Anonymous Browse',
    reviewFocus: 'Can anonymous users add to cart? Login prompt timing.',
  },
  {
    id: '05-checkout-anon',
    title: 'Checkout (Anonymous)',
    description: 'Anonymous user tries to checkout.',
    phase: 'Buyer Auth',
    reviewFocus: 'Login/OAuth prompt clarity, trust feeling.',
  },
  {
    id: '06-about',
    title: 'About / Store Profile',
    description: 'Store about page.',
    phase: 'Store Info',
    reviewFocus: 'Brand story, trust signals, contact info.',
  },
  {
    id: '07-seller-login',
    title: 'Seller Login',
    description: 'Seller BasicAuth login page.',
    phase: 'Seller Admin',
    reviewFocus: 'Login experience, dual-entry (seller/buyer) distinction.',
  },
  {
    id: '08-seller-dashboard',
    title: 'Seller Dashboard',
    description: 'Seller admin dashboard after login.',
    phase: 'Seller Admin',
    reviewFocus: 'SaaS version feature parity.',
  },
  {
    id: '09-seller-products',
    title: 'Seller Products',
    description: 'Seller product management.',
    phase: 'Seller Admin',
    reviewFocus: 'SaaS version operation parity.',
  },
  {
    id: '10-seller-settings',
    title: 'Seller Settings',
    description: 'Seller store settings.',
    phase: 'Seller Admin',
    reviewFocus: 'Configuration completeness.',
  },
];

// ─── Helpers ────────────────────────────────────────────────────────

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function captureStep(page: Page, stepId: string) {
  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    const dir = path.join(OUTPUT_DIR, name);
    ensureDir(dir);
    await page.setViewportSize(viewport);
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(dir, `${stepId}.png`),
      fullPage: true,
    });
  }
}

function basicAuthToken(user: string, pass: string): string {
  return Buffer.from(`${user}:${pass}`).toString('base64');
}

const PROFILE_DATA = {
  name: 'Demo Standalone Store',
  handle: 'artisangoods',
  about: 'Handcrafted goods, locally sourced materials.',
  shortDescription: 'Premium digital products',
  location: 'Portland, OR',
  peerID: PEER_ID,
  vendor: true,
  moderator: false,
  nsfw: false,
  private: false,
  stats: {
    listingCount: 7,
    digitalListingCount: 6,
    physicalListingCount: 0,
    serviceListingCount: 1,
    ratingCount: 0,
    averageRating: 0,
    followerCount: 0,
    followingCount: 0,
    postCount: 0,
  },
};

async function setupSellerAuth(page: Page) {
  const token = `basic:${basicAuthToken(SELLER_USER, SELLER_PASS)}`;

  const zustandState = JSON.stringify({
    state: {
      profile: PROFILE_DATA,
      isAuthenticated: true,
      authMode: 'basic',
      token,
      authSource: 'basic',
    },
    version: 0,
  });

  await page.addInitScript(
    ({ t, z }) => {
      localStorage.setItem('mobazha_auth_token', t);
      localStorage.setItem('mobazha-user-storage', z);
    },
    { t: token, z: zustandState }
  );
}

// ─── Test Suite ─────────────────────────────────────────────────────

test.describe.configure({ mode: 'serial' });

test.describe('Standalone Journey — 10-step AI UX Audit (Real Backend)', () => {
  test.setTimeout(180_000);

  // SA01: Anonymous Homepage
  test('SA01 — Homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.waitForTimeout(2000);
    await captureStep(page, '01-homepage');
  });

  // SA02: Anonymous Browse (store page shows listings)
  test('SA02 — Browse Products', async ({ page }) => {
    await page.goto(`/store/${PEER_ID}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.waitForTimeout(2000);
    await captureStep(page, '02-browse');
  });

  // SA03: Product Detail
  test('SA03 — Product Detail', async ({ page }) => {
    await page.goto(`/product/${LISTING_SLUGS[0]}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.waitForTimeout(2000);
    await captureStep(page, '03-product');
  });

  // SA04: Cart (add item first, then go to cart)
  test('SA04 — Cart', async ({ page }) => {
    await page.goto(`/product/${LISTING_SLUGS[0]}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.waitForTimeout(1000);

    const addBtn = page.getByRole('button', { name: /add to cart/i });
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(500);
    }

    await page.goto('/cart');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.waitForTimeout(1000);
    await captureStep(page, '04-cart');
  });

  // SA05: Checkout (anonymous — should prompt login)
  test('SA05 — Checkout (Anonymous)', async ({ page }) => {
    await page.goto(`/product/${LISTING_SLUGS[1]}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.waitForTimeout(1000);

    const addBtn = page.getByRole('button', { name: /add to cart/i });
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(500);
    }

    await page.goto('/checkout');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.waitForTimeout(2000);
    await captureStep(page, '05-checkout-anon');
  });

  // SA06: About / Store Profile (about is a tab within store page, not a separate route)
  test('SA06 — About / Store Profile', async ({ page }) => {
    await page.goto(`/store/${PEER_ID}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.waitForTimeout(1500);
    const aboutTab = page
      .getByRole('tab', { name: /about/i })
      .or(page.locator('[data-tab="about"]'));
    if (await aboutTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await aboutTab.click();
      await page.waitForTimeout(1000);
    }
    await captureStep(page, '06-about');
  });

  // SA07: Seller Login
  test('SA07 — Seller Login', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.waitForTimeout(1000);
    await captureStep(page, '07-seller-login');
  });

  // SA08: Seller Dashboard (authenticated)
  test('SA08 — Seller Dashboard', async ({ page }) => {
    await setupSellerAuth(page);
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.waitForTimeout(2000);
    await captureStep(page, '08-seller-dashboard');
  });

  // SA09: Seller Products
  test('SA09 — Seller Products', async ({ page }) => {
    await setupSellerAuth(page);
    await page.goto('/admin/products');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.waitForTimeout(2000);
    await captureStep(page, '09-seller-products');
  });

  // SA10: Seller Settings (admin settings route)
  test('SA10 — Seller Settings', async ({ page }) => {
    await setupSellerAuth(page);
    await page.goto('/admin/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.waitForTimeout(2000);
    await captureStep(page, '10-seller-settings');
  });
});

// ─── Manifest Generation ────────────────────────────────────────────

test.afterAll(() => {
  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
  const manifest = STEPS.map(s => ({
    ...s,
    persona: 'standalone',
    files: {
      mobile: `standalone/mobile/${s.id}.png`,
      desktop: `standalone/desktop/${s.id}.png`,
    },
  }));
  ensureDir(OUTPUT_DIR);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`[standalone-journey] Manifest written: ${manifestPath}`);
});
