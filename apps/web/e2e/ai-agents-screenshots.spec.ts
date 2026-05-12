/**
 * AI Agents Page — Visual Screenshots
 *
 * 通过 mock auth + API 拦截，截取三种模式下 AI Connect 页面的视觉状态：
 *   1. Non-outpost — 默认显示全部客户端，无隐私 banner（代表 SaaS / Standalone）
 *   2. Outpost (默认) — 隐藏 cloud-only 客户端，显示隐私 banner，开关关闭
 *   3. Outpost (开关开启) — 显示全部客户端 + 风险 badge
 *
 * 输出目录：apps/web/e2e-screenshots/ai-agents-*.png
 */

import { test, type Page } from '@playwright/test';

const MOCK_PROFILE = {
  peerID: 'QmMockPeerForScreenshot',
  name: 'Demo Store',
  handle: 'demo-store',
  about: '',
  shortDescription: '',
  vendor: true,
  moderator: false,
  avatarHashes: {},
  headerHashes: {},
};

const USER_STORAGE = {
  state: {
    profile: MOCK_PROFILE,
    peerID: MOCK_PROFILE.peerID,
    isAuthenticated: true,
    isLoading: false,
    isStoreOwner: true,
    authMode: 'basic',
    token: 'basic:mock-screenshot-token',
    authSource: 'basic',
  },
  version: 0,
};

interface SetupOptions {
  outpost: boolean;
  showHighRisk?: boolean;
  /** When true, simulate SaaS deployment (authMode: 'hosted' — no Auto Connect panel). */
  saas?: boolean;
}

async function setupPage(page: Page, opts: SetupOptions): Promise<void> {
  // 1) Inject runtime config + auth state BEFORE any app JS runs
  await page.addInitScript(
    ({ outpost, showHighRisk, userStorage, saas }) => {
      (window as unknown as Record<string, unknown>).__RUNTIME_CONFIG__ = {
        authMode: saas ? 'hosted' : 'standalone',
        outpostMode: outpost,
        disableExternalResources: outpost,
      };
      // Mock authenticated session.
      // - `mobazha_auth_token`: read by getStoredToken() during restoreSession.
      //   Use a `basic:` prefix so isTokenExpired() short-circuits to false and
      //   resolveAuthMode() returns 'basic' (store-owner path).
      // - `mobazha-user-storage`: zustand persist payload, populates profile +
      //   isAuthenticated synchronously during store hydration.
      try {
        window.localStorage.setItem('mobazha_auth_token', 'basic:mock-screenshot-token');
        window.localStorage.setItem('mobazha-user-storage', JSON.stringify(userStorage));
        window.localStorage.setItem(
          'mobazha:outpost:showHighRiskAiClients',
          showHighRisk ? '1' : '0'
        );
      } catch {
        // ignore
      }
    },
    {
      outpost: opts.outpost,
      showHighRisk: !!opts.showHighRisk,
      userStorage: USER_STORAGE,
      saas: !!opts.saas,
    }
  );

  // 2) Mock backend endpoints used by admin layout / ai-agents page
  await page.route('**/v1/system/setup/status', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { setupComplete: true, casdoorAvailable: false, hasAdmin: true },
      }),
    });
  });

  // Both getMyProfile() (/v1/profile) and the public profile lookup return our mock.
  await page.route('**/v1/profile', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: MOCK_PROFILE }),
    });
  });
  await page.route('**/v1/profiles/QmMockPeerForScreenshot*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: MOCK_PROFILE }),
    });
  });

  // Token list endpoint used by ApiTokenPanel
  await page.route('**/v1/auth/tokens', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      });
      return;
    }
    await route.continue();
  });

  // Catch-all: return empty 200 for any other v1 endpoint to keep the page
  // visually stable. We log unmocked URLs so newly-added API calls become
  // visible in CI output (without failing the screenshot pass).
  await page.route('**/v1/**', async route => {
    console.warn('[ai-agents-screenshots] unmocked endpoint:', route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: null }),
    });
  });

  // Suppress favicon/network errors
  await page.route('**/favicon.ico', route => route.fulfill({ status: 204, body: '' }));
}

test.describe('AI Agents Page Screenshots', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  // Non-outpost baseline: outpostMode=false. We deliberately keep authMode
  // as 'standalone' (not 'hosted') because the AI Agents page reads
  // `isOutpostMode()` for the privacy banner + client filtering, which is what
  // this test verifies. Switching to 'hosted' would trigger the onboarding
  // redirect (needsOnboarding === true) and fail to capture the AI Agents UI.
  // The screenshot file name is kept as `ai-agents-saas.png` for backward
  // compatibility with downstream review tooling.
  test('Non-outpost — full client list, no banner', async ({ page }) => {
    await setupPage(page, { outpost: false });

    await page.goto('/admin/ai-agents');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForSelector('h1', { timeout: 15000 });
    await page.waitForTimeout(800);

    await page.screenshot({
      path: 'e2e-screenshots/ai-agents-saas.png',
      fullPage: true,
    });
  });

  test('Outpost — banner + toggle off + filtered clients', async ({ page }) => {
    await setupPage(page, { outpost: true, showHighRisk: false });

    await page.goto('/admin/ai-agents');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForSelector('[data-testid="outpost-privacy-banner"]', { timeout: 15000 });
    await page.waitForTimeout(800);

    await page.screenshot({
      path: 'e2e-screenshots/ai-agents-outpost-default.png',
      fullPage: true,
    });
  });

  test('Outpost — banner + toggle on + all clients with risk badges', async ({ page }) => {
    await setupPage(page, { outpost: true, showHighRisk: true });

    await page.goto('/admin/ai-agents');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForSelector('[data-testid="outpost-privacy-banner"]', { timeout: 15000 });
    await page.waitForTimeout(800);

    await page.screenshot({
      path: 'e2e-screenshots/ai-agents-outpost-revealed.png',
      fullPage: true,
    });
  });
});
