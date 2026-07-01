/**
 * Playwright config for sovereign dev server testing.
 *
 * Starts a VITE_BUILD_TARGET=sovereign dev server and runs sovereign
 * E2E tests for fast iteration during development.
 *
 * Usage: pnpm test:e2e:sovereign:dev
 */

import { defineConfig, devices } from '@playwright/test';

const baseHost = process.env.PLAYWRIGHT_HOST || '127.0.0.1';
const port = process.env.PLAYWRIGHT_SOVEREIGN_PORT || '3003';
const timeoutMs = Number(process.env.PLAYWRIGHT_WEBSERVER_TIMEOUT_MS || 120000);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report-sovereign-dev' }], ['list']],

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
      name: 'sovereign',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /sovereign/,
    },
  ],

  webServer: {
    command: `VITE_BUILD_TARGET=sovereign pnpm dev --host ${baseHost} --port ${port} --strictPort`,
    url: `http://${baseHost}:${port}`,
    env: { ...process.env, VITE_BUILD_TARGET: 'sovereign', PORT: port },
    reuseExistingServer: true,
    timeout: timeoutMs,
  },
});
