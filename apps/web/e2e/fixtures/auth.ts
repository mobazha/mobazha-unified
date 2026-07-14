/**
 * Playwright Auth Fixtures
 * 认证相关的测试 fixture，提供已登录状态的页面和 API 工具
 *
 * 使用方法:
 *   import { authenticatedTest } from './fixtures/auth';
 *   authenticatedTest('test name', async ({ authedPage, apiContext }) => { ... });
 */

import { test as base, expect, type Page, type APIRequestContext } from '@playwright/test';

export const CASDOOR_URL = process.env.E2E_CASDOOR_URL || 'http://localhost:18000';
export const BACKEND_URL = process.env.E2E_BACKEND_URL || 'http://localhost:18080';
export const CASDOOR_APP = process.env.E2E_CASDOOR_APP || 'app-mobazha';
export const CASDOOR_ORG = process.env.E2E_CASDOOR_ORG || 'mobazha';

const TEST_USERNAME = process.env.E2E_TEST_USERNAME || 'testuser1';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || '123';

/**
 * Storage state file path for caching authenticated sessions.
 * This avoids re-logging in for every test.
 */
export const AUTH_STATE_FILE = 'playwright/.auth/user.json';

/**
 * Perform the Casdoor OAuth login flow in the browser.
 * Navigates to /login, fills Casdoor credentials, and waits for redirect back to app.
 */
export async function performCasdoorLogin(
  page: Page,
  username?: string,
  password?: string
): Promise<void> {
  const user = username || TEST_USERNAME;
  const pass = password || TEST_PASSWORD;

  if (!pass) {
    throw new Error('E2E_TEST_PASSWORD env var is required for auth tests');
  }

  await page.goto('/login');

  await page.waitForURL(url => url.toString().includes('login/oauth/authorize'), {
    timeout: 30000,
  });

  await page.waitForLoadState('domcontentloaded');

  const usernameInput = page.locator('input[type="text"]').first();
  await usernameInput.waitFor({ state: 'visible', timeout: 30000 });

  await usernameInput.fill(user);
  await page.locator('input[type="password"]').first().fill(pass);

  const signInBtn = page.getByRole('button', { name: /sign in|登录|log in/i }).first();
  await signInBtn.click();

  await page.waitForURL(
    url => {
      const urlStr = url.toString();
      return (
        urlStr.includes('localhost:') &&
        !urlStr.includes('login/oauth') &&
        !urlStr.includes('code=') &&
        !urlStr.includes('/login')
      );
    },
    { timeout: 60000 }
  );

  await page.waitForLoadState('domcontentloaded');

  // Wait for the app to finish auth initialization.
  // After OAuth redirect, the frontend calls signin + restoreSession which
  // fetches the user profile. The node may need time to fully initialize,
  // so we wait until the "Loading..." spinner disappears.
  const loadingIndicator = page.getByText('Loading...', { exact: true });
  for (let attempt = 0; attempt < 10; attempt++) {
    const isLoading = await loadingIndicator.isVisible().catch(() => false);
    if (!isLoading) break;
    await page.waitForTimeout(2000);
  }

  // The final waitForURL above resolves the moment the URL leaves /login (the
  // app lands on `/`), but the OAuth code→hosting-signin exchange can still be
  // in flight. If the caller navigates away now, that exchange is aborted and
  // the user store is never populated — every subsequent page renders its
  // signed-out gate. Block until the persisted Zustand store actually reports
  // isAuthenticated so callers can safely goto() an authenticated route.
  await page
    .waitForFunction(
      () => {
        try {
          const raw = window.localStorage.getItem('mobazha-user-storage');
          return !!raw && JSON.parse(raw)?.state?.isAuthenticated === true;
        } catch {
          return false;
        }
      },
      null,
      { timeout: 20000 }
    )
    .catch(() => {});

  await page.waitForTimeout(1000);
}

/**
 * Get a Casdoor JWT token via direct API call (type: "token").
 * This token can be used with /platform/v1/accounts/me on the hosting backend.
 */
export async function getCasdoorToken(
  request: APIRequestContext,
  username?: string,
  password?: string
): Promise<string> {
  const user = username || TEST_USERNAME;
  const pass = password || TEST_PASSWORD;

  if (!pass) {
    throw new Error('E2E_TEST_PASSWORD env var is required');
  }

  const loginResp = await request.post(`${CASDOOR_URL}/api/login`, {
    data: {
      application: CASDOOR_APP,
      organization: CASDOOR_ORG,
      username: user,
      password: pass,
      type: 'token',
    },
  });

  const loginData = await loginResp.json();
  if (loginData.status !== 'ok' || !loginData.data) {
    throw new Error(`Casdoor login failed for ${user}: ${JSON.stringify(loginData)}`);
  }

  return loginData.data as string;
}

/**
 * Get the peerID for a user by calling /platform/v1/accounts/me with a Casdoor token.
 */
export async function getPeerID(
  request: APIRequestContext,
  username?: string,
  password?: string
): Promise<string> {
  const token = await getCasdoorToken(request, username, password);

  const resp = await request.get(`${BACKEND_URL}/platform/v1/accounts/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await resp.json();
  const peerID = data?.data?.properties?.peerID;

  if (!peerID) {
    throw new Error(`No peerID found in userinfo for ${username}: ${JSON.stringify(data)}`);
  }

  return peerID;
}

/**
 * Worker-scoped hosting token obtained after the first browser login.
 * This is the token returned by /platform/v1/auth/signin, NOT a raw Casdoor JWT.
 * Raw Casdoor JWTs (from type:"token") can cause hosting to hang.
 */
let cachedHostingToken: string | undefined;

/**
 * Worker-scoped flag: true once the first test in this worker
 * has completed a browser-based Casdoor login and saved storageState.
 */
let workerAuthStateReady = false;

/**
 * Extract the hosting auth token from the browser's localStorage
 * after a successful OAuth login.
 */
async function extractHostingToken(page: Page): Promise<string | undefined> {
  return page.evaluate(() => window.localStorage.getItem('mobazha_auth_token') || undefined);
}

/**
 * Wait for hosting backend to be reachable (unauthenticated health check).
 * Uses an unauthenticated endpoint to avoid the token-format hang issue.
 */
async function waitForBackend(request: APIRequestContext): Promise<void> {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const resp = await request.get(`${BACKEND_URL}/v1/exchange-rates`, { timeout: 5000 });
      if (resp.ok()) return;
    } catch {
      // timeout or network error, retry
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  console.warn('⚠️ Backend may not be reachable — proceeding anyway');
}

/**
 * Extended test type with authenticated page and API context.
 * The first test per Playwright worker does a real Casdoor login.
 * Subsequent tests inject the saved localStorage token via addInitScript.
 */
/* eslint-disable react-hooks/rules-of-hooks */
export const authenticatedTest = base.extend<{
  authedPage: Page;
  casdoorToken: string;
}>({
  authedPage: async ({ page, request }, use) => {
    if (!workerAuthStateReady) {
      // First test: quick backend health check, then full browser login
      await waitForBackend(request);
      await performCasdoorLogin(page);
      await completeOnboardingIfNeeded(page);
      cachedHostingToken = await extractHostingToken(page);
      workerAuthStateReady = true;
    } else {
      // Subsequent tests: inject the hosting token extracted from the first login
      const token = cachedHostingToken;
      if (token) {
        await page.addInitScript((authToken: string) => {
          window.localStorage.setItem('mobazha_auth_token', authToken);
        }, token);
      }
      await page.goto('/admin');
      await page.waitForLoadState('domcontentloaded');

      // Wait for Loading to finish or redirect to login
      const loadingIndicator = page.getByText('Loading...', { exact: true });
      for (let attempt = 0; attempt < 10; attempt++) {
        const isLoading = await loadingIndicator.isVisible().catch(() => false);
        if (!isLoading) break;
        await page.waitForTimeout(2000);
      }

      // Verify we're authenticated; fallback to browser login if not
      if (page.url().includes('/login')) {
        await performCasdoorLogin(page);
        cachedHostingToken = await extractHostingToken(page);
      }
    }
    await use(page);
  },

  casdoorToken: async ({ request }, use) => {
    // For API-only usage, prefer the hosting token from browser login.
    // Fall back to raw Casdoor token for tests that only need /platform/ endpoints.
    const token = cachedHostingToken || (await getCasdoorToken(request));
    await use(token);
  },
});
/* eslint-enable react-hooks/rules-of-hooks */

/**
 * Complete onboarding if the user lands on the onboarding page after login.
 * Fills in a display name and clicks "Start Exploring", then waits for redirect.
 */
export async function completeOnboardingIfNeeded(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);

  const url = page.url();
  if (!url.includes('/onboarding')) {
    return;
  }

  const nameInput = page.locator('[data-testid="onboarding-display-name"]');
  const hasInput = await nameInput.isVisible({ timeout: 5000 }).catch(() => false);
  if (!hasInput) return;

  const currentValue = await nameInput.inputValue();
  if (!currentValue.trim()) {
    await nameInput.fill('Test User');
  }

  const submitBtn = page.locator('[data-testid="onboarding-submit"]');
  await submitBtn.click();

  await page.waitForURL(u => !u.toString().includes('/onboarding'), { timeout: 30000 });
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Full login + onboarding flow. Use this for authenticated visual tests.
 */
export async function loginAndSetup(
  page: Page,
  username?: string,
  password?: string
): Promise<void> {
  await performCasdoorLogin(page, username, password);
  await completeOnboardingIfNeeded(page);
}

export { expect };
