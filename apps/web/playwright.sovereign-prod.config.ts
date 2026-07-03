/**
 * Playwright config for sovereign production build testing.
 *
 * Builds sovereign bundle, serves via vite preview, and runs
 * sovereign E2E tests against the production output.
 *
 * Usage: pnpm test:e2e:sovereign
 */

import { defineConfig, devices } from '@playwright/test';

const baseHost = process.env.PLAYWRIGHT_HOST || '127.0.0.1';
const port = process.env.PLAYWRIGHT_SOVEREIGN_PROD_PORT || '3004';
const timeoutMs = Number(process.env.PLAYWRIGHT_WEBSERVER_TIMEOUT_MS || 240000);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report-sovereign-prod' }], ['list']],

  timeout: 120 * 1000,
  expect: { timeout: 15 * 1000 },

  use: {
    baseURL: `http://${baseHost}:${port}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 60 * 1000,
    actionTimeout: 30 * 1000,
  },

  projects: [
    {
      name: 'sovereign-prod',
      use: { ...devices['Desktop Chrome'] },
      // Match executable specs only. A broad /sovereign/ pattern also treats
      // helper modules under e2e/sovereign/fixtures as test files, and
      // Playwright then rejects legitimate imports from those helpers.
      testMatch: /sovereign.*\.spec\.ts$/,
    },
  ],

  webServer: {
    command: `pnpm build:sovereign && pnpm start --host ${baseHost} --port ${port} --strictPort`,
    url: `http://${baseHost}:${port}`,
    env: { ...process.env, PORT: port },
    reuseExistingServer: true,
    timeout: timeoutMs,
  },
});
