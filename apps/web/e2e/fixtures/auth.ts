/**
 * Playwright Auth Fixtures
 * 认证相关的测试 fixture，提供已登录状态的页面和 API 工具
 *
 * 使用方法:
 *   import { authenticatedTest } from './fixtures/auth';
 *   authenticatedTest('test name', async ({ authedPage, apiContext }) => { ... });
 */

import { test as base, expect, type Page, type APIRequestContext } from '@playwright/test';

// Casdoor 配置（与 hosting backend 的 app.local.yaml 对应）
const CASDOOR_URL = process.env.E2E_CASDOOR_URL || 'http://localhost:8000';
const BACKEND_URL = process.env.E2E_BACKEND_URL || 'http://localhost:8080';
const TEST_USERNAME = process.env.E2E_TEST_USERNAME || 'admin';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || '';

/**
 * Storage state file path for caching authenticated sessions.
 * This avoids re-logging in for every test.
 */
export const AUTH_STATE_FILE = 'playwright/.auth/user.json';

/**
 * Perform the Casdoor OAuth login flow in the browser.
 * Navigates to /login, fills Casdoor credentials, and waits for redirect back to app.
 */
export async function performCasdoorLogin(page: Page, username?: string, password?: string): Promise<void> {
  const user = username || TEST_USERNAME;
  const pass = password || TEST_PASSWORD;

  if (!pass) {
    throw new Error('E2E_TEST_PASSWORD env var is required for auth tests');
  }

  // Navigate to login page - should redirect to Casdoor
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Wait for Casdoor login form
  const usernameInput = page.getByPlaceholder(/username|email|phone|用户名/i).first();
  await usernameInput.waitFor({ state: 'visible', timeout: 15000 });

  // Fill credentials
  await usernameInput.fill(user);
  await page.getByPlaceholder(/password|密码/i).first().fill(pass);

  // Click sign in
  const signInBtn = page
    .getByRole('button', { name: /sign in|登录|log in/i })
    .first();
  await signInBtn.click();

  // Wait for redirect back to the app (OAuth callback + token exchange)
  await page.waitForURL(
    url => !url.toString().includes('casdoor') && !url.toString().includes(':8000'),
    { timeout: 30000 },
  );

  // Wait for app to settle after login
  await page.waitForLoadState('networkidle');
}

/**
 * Get a JWT token by calling the backend directly (for API-level testing within Playwright).
 */
export async function getApiToken(request: APIRequestContext): Promise<string> {
  const pass = TEST_PASSWORD;
  if (!pass) {
    throw new Error('E2E_TEST_PASSWORD env var is required');
  }

  // Step 1: Login to Casdoor to get auth code
  const loginResp = await request.post(`${CASDOOR_URL}/api/login`, {
    data: {
      application: process.env.E2E_CASDOOR_APP || 'app-built-in',
      organization: process.env.E2E_CASDOOR_ORG || 'built-in',
      username: TEST_USERNAME,
      password: pass,
      type: 'code',
    },
  });

  const loginData = await loginResp.json();
  if (loginData.status !== 'ok' || !loginData.data) {
    throw new Error(`Casdoor login failed: ${JSON.stringify(loginData)}`);
  }

  const authCode = loginData.data;

  // Step 2: Exchange code at hosting backend
  const signinResp = await request.post(
    `${BACKEND_URL}/api/signin?code=${authCode}&state=${process.env.E2E_CASDOOR_APP || 'app-built-in'}`,
  );

  const signinData = await signinResp.json();
  if (signinData.status !== 'ok' || !signinData.data) {
    throw new Error(`Hosting signin failed: ${JSON.stringify(signinData)}`);
  }

  return signinData.data;
}

/**
 * Extended test type with authenticated page and API context.
 */
/* eslint-disable react-hooks/rules-of-hooks */
export const authenticatedTest = base.extend<{
  authedPage: Page;
  apiToken: string;
}>({
  // Provide an already-authenticated page
  authedPage: async ({ page }, use) => {
    await performCasdoorLogin(page);
    await use(page);
  },

  // Provide a JWT token for direct API calls
  apiToken: async ({ request }, use) => {
    const token = await getApiToken(request);
    await use(token);
  },
});
/* eslint-enable react-hooks/rules-of-hooks */

export { expect };
