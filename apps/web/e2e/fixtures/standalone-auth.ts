/**
 * Standalone Store Auth Fixtures
 * 独立站认证 fixture（Basic Auth 模式）
 *
 * Usage:
 *   import { standaloneTest, STANDALONE_BASE } from './fixtures/standalone-auth';
 *   standaloneTest('test name', async ({ authedPage, api }) => { ... });
 */

import { test as base, expect, type Page, type APIRequestContext } from '@playwright/test';

export const STANDALONE_BASE = process.env.E2E_STANDALONE_URL || 'http://localhost:3002';
export const STANDALONE_API = process.env.E2E_STANDALONE_API || 'http://localhost:15104';

const ADMIN_USER = process.env.E2E_STANDALONE_USER || 'admin';
const ADMIN_PASS = process.env.E2E_STANDALONE_PASS || '';

function basicAuthHeader(user: string, pass: string): string {
  return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
}

/**
 * Read admin password from the standalone Docker container if not provided.
 * Returns empty string if standalone is not available (tests should skip).
 */
async function resolveAdminPassword(): Promise<string> {
  if (ADMIN_PASS) return ADMIN_PASS;

  try {
    const { execSync } = await import('child_process');
    const pw = execSync('docker exec e2e-standalone cat /data/admin_password 2>/dev/null', {
      encoding: 'utf-8',
      timeout: 10000,
    }).trim();
    if (pw) return pw;
  } catch {
    // container not running or password file not found
  }

  return '';
}

let cachedPassword: string | null = null;

async function getPassword(): Promise<string> {
  if (!cachedPassword) {
    cachedPassword = await resolveAdminPassword();
  }
  return cachedPassword;
}

/**
 * Create an API helper that talks directly to the standalone backend (Caddy proxy).
 */
export function createStandaloneApi(request: APIRequestContext, password: string) {
  const auth = basicAuthHeader(ADMIN_USER, password);

  async function apiGet(path: string) {
    return request.get(`${STANDALONE_API}${path}`, {
      headers: { Authorization: auth },
    });
  }

  async function apiPost(path: string, data?: unknown) {
    return request.post(`${STANDALONE_API}${path}`, {
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      data,
    });
  }

  async function apiPut(path: string, data?: unknown) {
    return request.put(`${STANDALONE_API}${path}`, {
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      data,
    });
  }

  async function apiDelete(path: string) {
    return request.delete(`${STANDALONE_API}${path}`, {
      headers: { Authorization: auth },
    });
  }

  return {
    get: apiGet,
    post: apiPost,
    put: apiPut,
    delete: apiDelete,

    async getProfile() {
      const resp = await apiGet('/v1/profiles');
      const body = await resp.json();
      return body.data ?? body;
    },

    async getListingIndex() {
      const resp = await apiGet('/v1/listings/index');
      const body = await resp.json();
      return body.data ?? body;
    },

    async getListings(peerID: string) {
      const resp = await request.get(`${STANDALONE_API}/v1/listings/${peerID}`);
      const body = await resp.json();
      return body.data ?? body;
    },

    async uploadProductImage(base64Data: string, filename: string) {
      const resp = await apiPost('/v1/media/product-images', [{ image: base64Data, filename }]);
      const body = await resp.json();
      return body.data ?? body;
    },

    async createListing(listing: Record<string, unknown>) {
      const resp = await apiPost('/v1/listings', listing);
      const body = await resp.json();
      return body.data ?? body;
    },

    async deleteListing(slug: string) {
      return apiDelete(`/v1/listings/${slug}`);
    },
  };
}

export type StandaloneApi = ReturnType<typeof createStandaloneApi>;

/**
 * Perform standalone admin login via the browser.
 */
export async function performStandaloneLogin(page: Page, password: string): Promise<void> {
  await page.goto('/admin');
  await page.waitForLoadState('domcontentloaded');

  const passwordInput = page.getByTestId('admin-login-password');
  await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
  await passwordInput.fill(password);

  const loginBtn = page.getByTestId('admin-login-submit');
  await loginBtn.click();

  await passwordInput.waitFor({ state: 'hidden', timeout: 30000 });
  await page.waitForLoadState('domcontentloaded');
}

/* eslint-disable react-hooks/rules-of-hooks */
export const standaloneTest = base.extend<{
  adminPassword: string;
  authedPage: Page;
  api: StandaloneApi;
}>({
  // eslint-disable-next-line no-empty-pattern
  adminPassword: async ({}, use, testInfo) => {
    const pw = await getPassword();
    if (!pw) {
      testInfo.skip(true, 'Standalone store not available (no admin password)');
      return;
    }
    await use(pw);
  },

  authedPage: async ({ page, adminPassword }, use) => {
    await performStandaloneLogin(page, adminPassword);
    await use(page);
  },

  api: async ({ request, adminPassword }, use) => {
    const api = createStandaloneApi(request, adminPassword);
    await use(api);
  },
});
/* eslint-enable react-hooks/rules-of-hooks */

export { expect };
