/**
 * Playwright E2E Test Configuration
 *
 * Env: PLAYWRIGHT_HOST, PLAYWRIGHT_PORT (override PORT for this config only), PORT,
 *      PLAYWRIGHT_WEBSERVER_TIMEOUT_MS.
 *
 * Project scoping:
 *   - chromium:           desktop-visual + general E2E (excludes mobile-visual, standalone & outpost)
 *   - Mobile Chrome:      mobile-visual  + general E2E (excludes desktop-visual, standalone & outpost)
 *   - standalone*:        standalone tests only
 *   - firefox/webkit/etc: opt-in via CLI --project flag
 *
 * Outpost testing uses dedicated configs (not started by default):
 *   - pnpm test:e2e:outpost:dev   → playwright.outpost-dev.config.ts (dev server)
 *   - pnpm test:e2e:outpost       → playwright.outpost-prod.config.ts (production build)
 */

import { defineConfig, devices } from '@playwright/test';

/** Default dev server port when neither PLAYWRIGHT_PORT nor PORT is set. */
const DEFAULT_PLAYWRIGHT_PORT = '3001';

const baseHost = process.env.PLAYWRIGHT_HOST || '127.0.0.1';
// Single source of truth: explicit E2E port overrides generic PORT (e.g. CI may set PORT for another process).
const basePort = process.env.PLAYWRIGHT_PORT || process.env.PORT || DEFAULT_PLAYWRIGHT_PORT;
const webServerTimeoutMs = Number(process.env.PLAYWRIGHT_WEBSERVER_TIMEOUT_MS || 120000);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],

  timeout: 120 * 1000,
  expect: {
    timeout: 15 * 1000,
    toHaveScreenshot: {
      maxDiffPixels: 200,
      threshold: 0.2,
    },
  },

  use: {
    baseURL: `http://${baseHost}:${basePort}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 60 * 1000,
    actionTimeout: 30 * 1000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: [/standalone/, /mobile-visual/, /outpost/],
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      testIgnore: [/standalone/, /desktop-visual/, /outpost/],
    },
    // Standalone store (port 3002, or 3000 for demo capture) — only standalone tests
    {
      name: 'standalone',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.STANDALONE_BASE_URL || 'http://localhost:3002',
      },
      testMatch: /standalone/,
    },
    {
      name: 'standalone-mobile',
      use: {
        ...devices['iPhone 12'],
        baseURL: process.env.STANDALONE_BASE_URL || 'http://localhost:3002',
      },
      testMatch: /standalone/,
    },
    // Cross-browser (opt-in via --project flag, not in default run)
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    //   testIgnore: [/standalone/, /mobile-visual/, /desktop-visual/],
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    //   testIgnore: [/standalone/, /mobile-visual/, /desktop-visual/],
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    //   testIgnore: [/standalone/, /desktop-visual/],
    // },
  ],

  webServer: {
    command: `pnpm dev --host ${baseHost} --port ${basePort} --strictPort`,
    url: `http://${baseHost}:${basePort}`,
    env: { ...process.env, PORT: basePort },
    reuseExistingServer: true,
    timeout: webServerTimeoutMs,
  },
});
