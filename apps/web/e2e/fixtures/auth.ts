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

  await page.waitForLoadState('networkidle');

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
        urlStr.includes('localhost:3000') &&
        !urlStr.includes('login/oauth') &&
        !urlStr.includes('code=') &&
        !urlStr.includes('/login')
      );
    },
    { timeout: 60000 }
  );

  await page.waitForLoadState('networkidle');
}

/**
 * Get a Casdoor JWT token via direct API call (type: "token").
 * This token can be used with /api/userinfo on the hosting backend.
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
 * Get the peerID for a user by calling /api/userinfo with a Casdoor token.
 */
export async function getPeerID(
  request: APIRequestContext,
  username?: string,
  password?: string
): Promise<string> {
  const token = await getCasdoorToken(request, username, password);

  const resp = await request.get(`${BACKEND_URL}/api/userinfo`, {
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
 * Extended test type with authenticated page and API context.
 */
/* eslint-disable react-hooks/rules-of-hooks */
export const authenticatedTest = base.extend<{
  authedPage: Page;
  casdoorToken: string;
}>({
  authedPage: async ({ page }, use) => {
    await performCasdoorLogin(page);
    await use(page);
  },

  casdoorToken: async ({ request }, use) => {
    const token = await getCasdoorToken(request);
    await use(token);
  },
});
/* eslint-enable react-hooks/rules-of-hooks */

export { expect };
