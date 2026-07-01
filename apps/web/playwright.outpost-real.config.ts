/**
 * Playwright config for testing against a real Outpost backend.
 *
 * No web server is started — the test expects a running Outpost binary
 * at OUTPOST_URL (default http://127.0.0.1:5102).
 *
 * Usage:
 *   OUTPOST_URL=http://127.0.0.1:5102 pnpm test:e2e:outpost:real
 */

import { defineConfig, devices } from '@playwright/test';

const outpostUrl = process.env.OUTPOST_URL || 'http://127.0.0.1:5102';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report-outpost-real' }], ['list']],

  timeout: 120 * 1000,
  expect: { timeout: 30 * 1000 },

  use: {
    baseURL: outpostUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 60 * 1000,
    actionTimeout: 30 * 1000,
  },

  projects: [
    {
      name: 'outpost-real',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /outpost.*real|outpost.*e2e/,
    },
  ],
});
