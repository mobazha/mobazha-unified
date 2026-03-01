/**
 * Screenshot Capture with Mock Data + TG Mini App Simulation
 *
 * Takes three variants per page:
 *   1. Mobile (375x812 @3x) — standard mobile browser
 *   2. Desktop (1440x900)
 *   3. TG Mini App (375x812 + injected window.Telegram.WebApp)
 *
 * Usage:
 *   cd apps/web
 *   SCREENSHOT_PATH=/product/wireless-headphones SCREENSHOT_NAME=product-detail \
 *     npx playwright test e2e/screenshot-mobile.spec.ts --project=chromium
 *
 * Env vars:
 *   SCREENSHOT_PATH  - URL path to screenshot (default: /)
 *   SCREENSHOT_NAME  - Output filename prefix (default: screenshot)
 *   BASE_URL         - Override base URL (default: http://localhost:3001)
 *   SKIP_TG          - Set "1" to skip TG screenshot
 *   MOCK_API         - Set "0" to skip API mocking (default: enabled)
 */

import { test, type BrowserContext, type Page } from '@playwright/test';
import path from 'path';
import {
  mockProductDetailAPI,
  mockImageRoutes,
  mockSearchAPI,
  getCartLocalStorageScript,
} from './fixtures/mock-api-routes';

const urlPath = process.env.SCREENSHOT_PATH || '/';
const outputName = process.env.SCREENSHOT_NAME || 'screenshot';
const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
const skipTG = process.env.SKIP_TG === '1';
const mockAPI = process.env.MOCK_API !== '0';

const MOBILE_DIR = path.resolve(__dirname, '../../../docs/screenshots/mobile');
const DESKTOP_DIR = path.resolve(__dirname, '../../../docs/screenshots/desktop');
const TG_DIR = path.resolve(__dirname, '../../../docs/screenshots/tg');

const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

async function setupMockRoutes(page: Page): Promise<void> {
  if (!mockAPI) return;

  await mockProductDetailAPI(page);
  await mockSearchAPI(page);
  await mockImageRoutes(page);

  await page.route('**/v1/profiles/**', (route, request) => {
    if (request.method() !== 'GET') return route.fallback();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          peerID: 'QmY8tRnCzUf45FnPLMvFi35R5bYjCEiCKbgEN39xnScj8P',
          name: 'TechStore Pro',
          handle: '@techstore',
          location: 'San Francisco, CA',
          about: 'Premium electronics and accessories',
          avatarHashes: {
            tiny: 'https://picsum.photos/id/64/100/100',
            small: 'https://picsum.photos/id/64/150/150',
            medium: 'https://picsum.photos/id/64/300/300',
          },
          stats: {
            followerCount: 1250,
            followingCount: 48,
            listingCount: 36,
            ratingCount: 124,
            averageRating: 4.8,
          },
        },
      }),
    });
  });

  await page.route('**/v1/ratings/**', (route, request) => {
    if (request.method() !== 'GET') return route.fallback();
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          ratings: [
            {
              slug: 'wireless-headphones',
              overall: 5,
              quality: 5,
              description: 4,
              deliverySpeed: 5,
              customerService: 5,
              review: 'Incredible sound quality and the noise cancellation is top-notch!',
              buyerName: 'AudioFan',
              buyerAvatar: { tiny: 'https://picsum.photos/id/10/50/50' },
              timestamp: new Date(Date.now() - 3 * 86400000).toISOString(),
            },
            {
              slug: 'wireless-headphones',
              overall: 4,
              quality: 5,
              description: 4,
              deliverySpeed: 4,
              customerService: 5,
              review: 'Great headphones, very comfortable for long listening sessions.',
              buyerName: 'MusicLover',
              buyerAvatar: { tiny: 'https://picsum.photos/id/20/50/50' },
              timestamp: new Date(Date.now() - 7 * 86400000).toISOString(),
            },
          ],
          count: 24,
          average: 4.8,
        },
      }),
    });
  });
}

const TG_WEBAPP_INJECT_SCRIPT = `
window.Telegram = {
  WebApp: {
    initData: 'mock_tg_init_data_for_screenshot',
    initDataUnsafe: {
      user: { id: 123456, first_name: 'Test', last_name: 'User', username: 'testuser' },
    },
    themeParams: {
      bg_color: '#ffffff',
      text_color: '#000000',
      hint_color: '#999999',
      link_color: '#2481cc',
      button_color: '#5288c1',
      button_text_color: '#ffffff',
      secondary_bg_color: '#efeff3',
      header_bg_color: '#ffffff',
      accent_text_color: '#2481cc',
      section_bg_color: '#ffffff',
      section_header_text_color: '#6d6d72',
      subtitle_text_color: '#8e8e93',
      destructive_text_color: '#ff3b30',
    },
    MainButton: {
      text: '', color: '#5288c1', textColor: '#ffffff',
      isVisible: false, isActive: true, isProgressVisible: false,
      setText: function(t) { this.text = t; },
      onClick: function() {}, offClick: function() {},
      show: function() { this.isVisible = true; },
      hide: function() { this.isVisible = false; },
      enable: function() { this.isActive = true; },
      disable: function() { this.isActive = false; },
      showProgress: function() { this.isProgressVisible = true; },
      hideProgress: function() { this.isProgressVisible = false; },
      setParams: function(p) { Object.assign(this, p); },
    },
    BackButton: {
      isVisible: false,
      onClick: function() {}, offClick: function() {},
      show: function() { this.isVisible = true; },
      hide: function() { this.isVisible = false; },
    },
    HapticFeedback: {
      impactOccurred: function() {},
      notificationOccurred: function() {},
      selectionChanged: function() {},
    },
    ready: function() {},
    expand: function() {},
    close: function() {},
    setHeaderColor: function() {},
    setBackgroundColor: function() {},
    version: '7.0',
    platform: 'ios',
    colorScheme: 'light',
    isExpanded: true,
  },
};
`;

async function createMobileContext(
  browser: import('@playwright/test').Browser
): Promise<BrowserContext> {
  return browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: MOBILE_UA,
  });
}

async function takeScreenshot(
  ctx: BrowserContext,
  url: string,
  outputPath: string,
  label: string,
  preScripts?: string[]
): Promise<void> {
  const page = await ctx.newPage();

  if (preScripts) {
    for (const script of preScripts) {
      await page.addInitScript(script);
    }
  }

  await setupMockRoutes(page);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);

  await page.screenshot({ path: outputPath, fullPage: true });
  // eslint-disable-next-line no-console
  console.log(`${label} screenshot saved: ${path.basename(outputPath)}`);
}

const cartScript = getCartLocalStorageScript();

test(`screenshot: ${outputName}`, async ({ browser }) => {
  const url = `${baseUrl}${urlPath}`;
  const isCartPage = urlPath.startsWith('/cart');
  const extraScripts = isCartPage ? [cartScript] : [];

  // 1. Mobile screenshot
  const mobileCtx = await createMobileContext(browser);
  await takeScreenshot(
    mobileCtx,
    url,
    path.join(MOBILE_DIR, `${outputName}-375.png`),
    'Mobile',
    extraScripts.length > 0 ? extraScripts : undefined
  );
  await mobileCtx.close();

  // 2. Desktop screenshot
  const desktopCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await takeScreenshot(
    desktopCtx,
    url,
    path.join(DESKTOP_DIR, `${outputName}-1440.png`),
    'Desktop',
    extraScripts.length > 0 ? extraScripts : undefined
  );
  await desktopCtx.close();

  // 3. TG Mini App screenshot
  if (!skipTG) {
    const tgCtx = await createMobileContext(browser);
    await takeScreenshot(tgCtx, url, path.join(TG_DIR, `${outputName}-tg-375.png`), 'TG Mini App', [
      TG_WEBAPP_INJECT_SCRIPT,
      ...extraScripts,
    ]);
    await tgCtx.close();
  }
});
